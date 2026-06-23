import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/node'
import { deployMocks } from 'cofhe-hardhat-plugin'

const line = '─'.repeat(64)
const step = (n: number, title: string) => console.log(`\n${line}\n  ${n}. ${title}\n${line}`)

// Runs a complete blind negotiation end-to-end against the local CoFHE mocks.
// Nothing about either party's limit is ever revealed; the only cleartext that
// leaves the contract is the agreed settlement price, and only to the two parties.
task('demo', 'Run a full blind negotiation end-to-end on the local CoFHE mocks')
	.addOptionalParam('seller', "Seller's secret minimum (price floor)", '80')
	.addOptionalParam('buyer', "Buyer's secret maximum (price ceiling)", '120')
	.setAction(async (args, hre: HardhatRuntimeEnvironment) => {
		const sellerMin = BigInt(args.seller)
		const buyerMax = BigInt(args.buyer)

		// Stand up the mock CoFHE coprocessor on the in-process Hardhat network.
		await deployMocks(hre, { deployTestBed: true, gasWarning: false })

		const [, seller, buyer] = await hre.ethers.getSigners()

		step(1, 'Deploy VeilNegotiation')
		const veil = await (await hre.ethers.getContractFactory('VeilNegotiation')).deploy()
		await veil.waitForDeployment()
		console.log(`     contract: ${await veil.getAddress()}`)
		console.log(`     seller:   ${seller.address}`)
		console.log(`     buyer:    ${buyer.address}`)
		console.log(`\n     (secret) seller minimum = ${sellerMin}`)
		console.log(`     (secret) buyer maximum  = ${buyerMax}`)

		step(2, 'Open a negotiation')
		await (await veil.connect(seller).createNegotiation(buyer.address)).wait()
		console.log('     negotiation #0 opened (status: Open)')

		step(3, 'Seller submits an ENCRYPTED floor')
		await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(seller))
		const [encSeller] = await hre.cofhe.expectResultSuccess(
			cofhejs.encrypt([Encryptable.uint64(sellerMin)] as const),
		)
		await (await veil.connect(seller).submitLimit(0, encSeller)).wait()
		console.log(`     ciphertext handle: ${encSeller.ctHash}`)
		console.log('     on-chain value is encrypted; the buyer learns nothing')

		step(4, 'Buyer submits an ENCRYPTED ceiling (auto-resolves)')
		await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(buyer))
		const [encBuyer] = await hre.cofhe.expectResultSuccess(
			cofhejs.encrypt([Encryptable.uint64(buyerMax)] as const),
		)
		await (await veil.connect(buyer).submitLimit(0, encBuyer)).wait()
		console.log(`     ciphertext handle: ${encBuyer.ctHash}`)
		console.log('     both limits in -> contract resolves on ciphertext (gte + midpoint)')

		step(5, 'Finalize once the encrypted comparison is decrypted')
		await hre.network.provider.send('evm_increaseTime', [15])
		await hre.network.provider.send('evm_mine', [])
		await (await veil.connect(seller).finalize(0)).wait()

		const status = await veil.getStatus(0)
		if (status === 2n) {
			await hre.network.provider.send('evm_increaseTime', [15])
			await hre.network.provider.send('evm_mine', [])
			const settlement = await veil.connect(seller).getSettlement(0)
			console.log('\n     ✅ DEAL: settled at the encrypted midpoint')
			console.log(`        settlement price = ${settlement}`)
			console.log(`        (expected midpoint = ${(sellerMin + buyerMax) / 2n})`)
			console.log('        neither side ever saw the other\'s limit')
		} else if (status === 3n) {
			console.log('\n     ❌ NO DEAL: limits did not overlap')
			console.log('        the contract reveals nothing beyond "no deal";')
			console.log('        both numbers stay secret forever')
		} else {
			console.log(`\n     unexpected status: ${status}`)
		}
		console.log()
	})
