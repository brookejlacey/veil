import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeployment } from './utils'

task('create-negotiation', 'Create a new blind negotiation')
	.addParam('counterparty', 'Address of the counterparty')
	.setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
		const { ethers, network } = hre

		const address = getDeployment(network.name, 'VeilNegotiation')
		if (!address) throw new Error('VeilNegotiation not deployed on this network')

		const veil = await ethers.getContractAt('VeilNegotiation', address)
		const tx = await veil.createNegotiation(taskArgs.counterparty)
		const receipt = await tx.wait()

		console.log(`Negotiation created. TX: ${receipt?.hash}`)
	})
