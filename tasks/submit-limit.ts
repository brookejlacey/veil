import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeployment } from './utils'
import { cofhejs, Encryptable } from 'cofhejs/node'

task('submit-limit', 'Submit your encrypted limit to a negotiation')
	.addParam('id', 'Negotiation ID')
	.addParam('limit', 'Your price limit (will be encrypted)')
	.setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
		const { ethers, network } = hre

		const address = getDeployment(network.name, 'VeilNegotiation')
		if (!address) throw new Error('VeilNegotiation not deployed on this network')

		const [signer] = await ethers.getSigners()
		const veil = await ethers.getContractAt('VeilNegotiation', address)

		// Encrypt the limit client-side
		const [encryptedLimit] = await hre.cofhe.expectResultSuccess(
			cofhejs.encrypt([Encryptable.uint64(BigInt(taskArgs.limit))] as const)
		)

		const tx = await veil.connect(signer).submitLimit(taskArgs.id, encryptedLimit)
		const receipt = await tx.wait()

		console.log(`Limit submitted for negotiation ${taskArgs.id}. TX: ${receipt?.hash}`)
	})
