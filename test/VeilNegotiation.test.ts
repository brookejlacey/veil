import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/node'

describe('VeilNegotiation', function () {
	async function deployVeilFixture() {
		const [deployer, seller, buyer, outsider] = await hre.ethers.getSigners()

		const Veil = await hre.ethers.getContractFactory('VeilNegotiation')
		const veil = await Veil.deploy()

		return { veil, deployer, seller, buyer, outsider }
	}

	describe('Negotiation Lifecycle', function () {
		beforeEach(function () {
			if (!hre.cofhe.isPermittedEnvironment('MOCK')) this.skip()
		})

		it('Should create a negotiation', async function () {
			const { veil, seller, buyer } = await loadFixture(deployVeilFixture)

			await expect(veil.connect(seller).createNegotiation(buyer.address))
				.to.emit(veil, 'NegotiationCreated')
				.withArgs(0, seller.address, buyer.address)

			const status = await veil.getStatus(0)
			expect(status).to.equal(0) // Status.Open
		})

		it('Should reject self-negotiation', async function () {
			const { veil, seller } = await loadFixture(deployVeilFixture)

			await expect(
				veil.connect(seller).createNegotiation(seller.address)
			).to.be.revertedWith('Cannot negotiate with yourself')
		})

		it('Should reject unauthorized limit submission', async function () {
			const { veil, seller, buyer, outsider } = await loadFixture(deployVeilFixture)

			await veil.connect(seller).createNegotiation(buyer.address)

			await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(outsider))
			const [encrypted] = await hre.cofhe.expectResultSuccess(
				cofhejs.encrypt([Encryptable.uint64(100n)] as const)
			)

			await expect(
				veil.connect(outsider).submitLimit(0, encrypted)
			).to.be.revertedWith('Not a party to this negotiation')
		})

		it('Should settle when buyer max >= seller min (deal exists)', async function () {
			const { veil, seller, buyer } = await loadFixture(deployVeilFixture)

			await veil.connect(seller).createNegotiation(buyer.address)

			// Seller submits minimum: 80
			await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(seller))
			const [sellerLimit] = await hre.cofhe.expectResultSuccess(
				cofhejs.encrypt([Encryptable.uint64(80n)] as const)
			)
			await veil.connect(seller).submitLimit(0, sellerLimit)

			// Verify status is still Open after first submission
			expect(await veil.getStatus(0)).to.equal(0) // Open

			// Buyer submits maximum: 120
			await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(buyer))
			const [buyerLimit] = await hre.cofhe.expectResultSuccess(
				cofhejs.encrypt([Encryptable.uint64(120n)] as const)
			)

			// This should auto-resolve
			await expect(veil.connect(buyer).submitLimit(0, buyerLimit))
				.to.emit(veil, 'LimitSubmitted')

			// Advance time to allow mock decryption to complete
			await time.increase(15)

			// Finalize
			await veil.connect(seller).finalize(0)

			expect(await veil.getStatus(0)).to.equal(2) // Settled

			// Advance time again for settlement decryption
			await time.increase(15)

			// Settlement should be midpoint: (80 + 120) / 2 = 100
			const settlement = await veil.connect(seller).getSettlement(0)
			expect(settlement).to.equal(100n)
		})

		it('Should result in NoDeal when buyer max < seller min', async function () {
			const { veil, seller, buyer } = await loadFixture(deployVeilFixture)

			await veil.connect(seller).createNegotiation(buyer.address)

			// Seller wants at least 150
			await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(seller))
			const [sellerLimit] = await hre.cofhe.expectResultSuccess(
				cofhejs.encrypt([Encryptable.uint64(150n)] as const)
			)
			await veil.connect(seller).submitLimit(0, sellerLimit)

			// Buyer will only pay up to 100
			await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(buyer))
			const [buyerLimit] = await hre.cofhe.expectResultSuccess(
				cofhejs.encrypt([Encryptable.uint64(100n)] as const)
			)
			await veil.connect(buyer).submitLimit(0, buyerLimit)

			// Advance time to allow mock decryption to complete
			await time.increase(15)

			// Finalize
			await veil.connect(seller).finalize(0)

			expect(await veil.getStatus(0)).to.equal(3) // NoDeal
		})

		it('Should allow cancellation before both submit', async function () {
			const { veil, seller, buyer } = await loadFixture(deployVeilFixture)

			await veil.connect(seller).createNegotiation(buyer.address)

			await expect(veil.connect(seller).cancel(0))
				.to.emit(veil, 'NegotiationCancelled')
				.withArgs(0)

			expect(await veil.getStatus(0)).to.equal(4) // Cancelled
		})

		it('Should prevent double submission', async function () {
			const { veil, seller, buyer } = await loadFixture(deployVeilFixture)

			await veil.connect(seller).createNegotiation(buyer.address)

			await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(seller))
			const [limit1] = await hre.cofhe.expectResultSuccess(
				cofhejs.encrypt([Encryptable.uint64(80n)] as const)
			)
			await veil.connect(seller).submitLimit(0, limit1)

			const [limit2] = await hre.cofhe.expectResultSuccess(
				cofhejs.encrypt([Encryptable.uint64(90n)] as const)
			)
			await expect(
				veil.connect(seller).submitLimit(0, limit2)
			).to.be.revertedWith('Already submitted')
		})
	})
})
