import { ethers } from 'ethers'
import sdk from './1-initialize-sdk.js'
import { readFileSync } from 'fs'

const app = sdk.getAppModule(process.env.APP_MODULE_ADDRESS)

;(async () => {
	try {
		const bundleDropModule = await app.deployBundleDropModule({
			// The collection's name, ex. CryptoPunks
			name: 'AE-DAO Members',
			// A description for the collection.
			description: 'A DAO for AE members.',
			// The image for the collection that will show up on OpenSea.
			image: readFileSync('scripts/assets/AE_logo.png'),
			// We need to pass in the address of the person who will be receiving the proceeds from sales of nfts in the module.
			// We're planning on not charging people for the drop, so we'll pass in the 0x0 address
			// you can set this to your own wallet address if you want to charge for the drop.
			primarySaleRecipientAddress: '0x56d8Bf89371Ba9eD001a27aC7A1fAB640Afe4f91',
		})

		console.log(
			'✅ Successfully deployed bundleDrop module, address:',
			bundleDropModule.address
		)
		console.log('✅ bundleDrop metadata:', await bundleDropModule.getMetadata())
	} catch (error) {
		console.log('failed to deploy bundleDrop module', error)
	}
})()

// 0x5d5929D7c5dD0795649c1fDB63a48a285B84D6f6
