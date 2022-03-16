import sdk from './1-initialize-sdk.js'
import { readFileSync } from 'fs'

const bundleDrop = sdk.getBundleDropModule(process.env.BUNDLE_DROP_ADDRESS)

;(async () => {
	try {
		await bundleDrop.createBatch([
			{
				name: 'AE-DAO',
				description: 'This NFT will give you access to the AE-DAO!',
				image: readFileSync('scripts/assets/turtlae.jpg'),
			},
		])
		console.log('✅ Successfully created a new NFT in the drop!')
	} catch (error) {
		console.error('failed to create the new NFT', error)
	}
})()
