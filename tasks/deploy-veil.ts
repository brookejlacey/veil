import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-veil', 'Deploy the VeilNegotiation contract').setAction(async (_, hre: HardhatRuntimeEnvironment) => {
	const { ethers, network } = hre

	console.log(`Deploying VeilNegotiation to ${network.name}...`)

	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const Veil = await ethers.getContractFactory('VeilNegotiation')
	const veil = await Veil.deploy()
	await veil.waitForDeployment()

	const veilAddress = await veil.getAddress()
	console.log(`VeilNegotiation deployed to: ${veilAddress}`)

	saveDeployment(network.name, 'VeilNegotiation', veilAddress)

	return veilAddress
})
