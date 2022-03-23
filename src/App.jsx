import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { ThirdwebSDK } from '@3rdweb/sdk'
import { UnsupportedChainIdError } from '@web3-react/core'
import { useWeb3 } from '@3rdweb/hooks'

import {
	BUNDLE_DROP_ADDRESS,
	TOKEN_MODULE_ADDRESS,
	VOTE_MODULE_ADDRESS,
} from './utils/constants'

const sdk = new ThirdwebSDK('rinkeby')
const bundleDropModule = sdk.getBundleDropModule(BUNDLE_DROP_ADDRESS)
const tokenModule = sdk.getTokenModule(TOKEN_MODULE_ADDRESS)
const voteModule = sdk.getVoteModule(VOTE_MODULE_ADDRESS)

const App = () => {
	const { connectWallet, address, error, provider } = useWeb3()
	console.log('👋 Address:', address)

	const signer = provider ? provider.getSigner() : undefined

	const [hasClaimedNFT, setHasClaimedNFT] = useState(false)
	const [isClaiming, setIsClaiming] = useState(false)

	const [memberTokenAmounts, setMemberTokenAmounts] = useState({})
	const [memberAddresses, setMemberAddresses] = useState([])

	const [allProposals, setAllProposals] = useState([])
	const [activeProposals, setActiveProposals] = useState([])
	const [votedProposals, setVotedProposals] = useState([])
	const [defeatedProposals, setDefeatedProposals] = useState([])
	const [executedProposals, setExecutedProposals] = useState([])

	const [isVoting, setIsVoting] = useState(false)
	const [hasVoted, setHasVoted] = useState(false)

	const [proposalInputAmount, setProposalInputAmount] = useState()
	const [proposalInputAddress, setProposalInputAddress] = useState('')
	const [proposalInputReason, setProposalInputReason] = useState('')
	const [isProposing, setIsProposing] = useState(false)
	const [hasProposed, setHasProposed] = useState(false)

	// Retrieve all existing proposals from the contract.
	useEffect(async () => {
		if (!hasClaimedNFT) {
			return
		}

		try {
			const proposals = await voteModule.getAll()
			setAllProposals(proposals)
			console.log('🌈 Proposals:', proposals)
			proposals.map(async (proposal) => {
				// active
				if (proposal.state === 1) {
					let hasVoted = await voteModule.hasVoted(proposal.proposalId, address)
					if (hasVoted) {
						setVotedProposals((votedProposals) => [...votedProposals, proposal])
						console.log('🟣 votedProposals:', votedProposals)
					} else {
						setActiveProposals((activeProposals) => [
							...activeProposals,
							proposal,
						])
						console.log('🔵 ActiveProposals:', activeProposals)
					}
				}
				// Defeated
				if (proposal.state === 3) {
					setDefeatedProposals((defeatedProposals) => [
						...defeatedProposals,
						proposal,
					])
					console.log('🔴  defeatedProposals:', defeatedProposals)
				}
				// Executed
				if (proposal.state === 7) {
					setExecutedProposals((executedProposals) => [
						...executedProposals,
						proposal,
					])
					console.log('🟢  executedProposals:', executedProposals)
				}
				// state 1: Active
				// state 3: Defeated
				// state 7: Executed
			})
		} catch (error) {
			console.log('failed to get proposals', error)
		}
	}, [hasClaimedNFT, hasProposed, hasVoted])

	const shortenAddress = (str) => {
		return str.substring(0, 6) + '...' + str.substring(str.length - 4)
	}

	useEffect(async () => {
		if (!hasClaimedNFT) {
			return
		}

		try {
			const memberAddresses = await bundleDropModule.getAllClaimerAddresses('0')
			setMemberAddresses(memberAddresses)
			console.log('🚀 Members addresses', memberAddresses)
		} catch (error) {
			console.error('failed to get member list', error)
		}
	}, [hasClaimedNFT])

	// Get all token holder balances
	useEffect(async () => {
		if (!hasClaimedNFT) {
			return
		}

		try {
			const amounts = await tokenModule.getAllHolderBalances()
			setMemberTokenAmounts(amounts)
			console.log('👜 Amounts', amounts)
		} catch (error) {
			console.error('failed to get token amounts', error)
		}
	}, [hasClaimedNFT])

	const memberList = useMemo(() => {
		return memberAddresses.map((address) => {
			return {
				address,
				tokenAmount: ethers.utils.formatUnits(
					memberTokenAmounts[address] || 0,
					18
				),
			}
		})
	}, [memberAddresses, memberTokenAmounts])

	useEffect(() => {
		sdk.setProviderOrSigner(signer)
	}, [signer])

	useEffect(async () => {
		if (!address) {
			return
		}

		const balance = await bundleDropModule.balanceOf(address, '0')

		try {
			// If balance is greater than 0, they have our NFT!
			if (balance.gt(0)) {
				setHasClaimedNFT(true)
				console.log('🌟 this user has a membership NFT!')
			} else {
				setHasClaimedNFT(false)
				console.log("😭 this user doesn't have a membership NFT.")
			}
		} catch (error) {
			setHasClaimedNFT(false)
			console.error('failed to nft balance', error)
		}
	}, [address])

	if (error instanceof UnsupportedChainIdError) {
		return (
			<div className="unsupported-network">
				<h2>Please connect to Rinkeby</h2>
				<p>
					This dapp only works on the Rinkeby network, please switch networks in
					your connected wallet.
				</p>
			</div>
		)
	}

	if (!address) {
		return (
			<div className="landing">
				<h1>Welcome to AE DAO</h1>
				<div>
					<button
						onClick={() => connectWallet('injected')}
						className="btn-hero"
					>
						Connect your wallet
					</button>
				</div>
			</div>
		)
	}

	const mintNft = async () => {
		setIsClaiming(true)
		try {
			// Mint nft to user's wallet.
			await bundleDropModule.claim('0', 1)

			setHasClaimedNFT(true)

			console.log(
				`🌊 Successfully Minted! OpenSea: https://testnets.opensea.io/assets/${bundleDropModule.address}/0`
			)
		} catch (error) {
			console.error('failed to claim', error)
		} finally {
			setIsClaiming(false)
		}
	}

	// Propose user's vote
	const proposeVote = async () => {
		const tokenModule = sdk.getTokenModule(TOKEN_MODULE_ADDRESS)
		try {
			setIsProposing(true)
			await tokenModule.delegateTo(address)

			await voteModule.propose(
				'Should the DAO transfer ' +
					proposalInputAmount +
					' tokens from the treasury to ' +
					proposalInputAddress +
					' ' +
					proposalInputReason,
				[
					{
						nativeTokenValue: 0,
						transactionData: tokenModule.contract.interface.encodeFunctionData(
							'transfer',
							[
								proposalInputAddress,
								ethers.utils.parseUnits(proposalInputAmount.toString(), 18),
							]
						),

						toAddress: tokenModule.address,
					},
				]
			)
			setIsProposing(false)
			setHasProposed(true)
			console.log(
				"✅ Successfully created proposal to reward user from the treasury, let's hope people vote for it!"
			)
			console.log(
				`Proposal\nTo user: ${proposalInputAddress} \nAmount: ${proposalInputAmount}\nReason: ${proposalInputReason}`
			)
		} catch (error) {
			setIsProposing(false)
			console.error('failed to create second proposal', error)
		}
	}

	if (hasClaimedNFT) {
		return (
			<div className="member-page">
				<h1>🦋AE DAO Member Page</h1>
				<p>{address}</p>
				<p>Congratulations on being a member</p>
				<div>
					<div>
						<h2>Member List</h2>
						<table className="card">
							<thead>
								<tr>
									<th>Address</th>
									<th>Token Amount</th>
								</tr>
							</thead>
							<tbody>
								{memberList.map((member) => {
									return (
										<tr key={member.address}>
											<td>{shortenAddress(member.address)}</td>
											<td>{member.tokenAmount}</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>

					{activeProposals.length > 0 && (
						<div>
							<h2>Active Proposals</h2>
							<form
								onSubmit={async (e) => {
									e.preventDefault()
									e.stopPropagation()

									setHasVoted(false)
									setIsVoting(true)

									// Get the votes from the form for the values

									const votes = activeProposals.map((proposal) => {
										let voteResult = {
											proposalId: proposal.proposalId,

											vote: 2,
										}
										proposal.votes.forEach((vote) => {
											const elem = document.getElementById(
												proposal.proposalId + '-' + vote.type
											)

											if (elem.checked) {
												voteResult.vote = vote.type
												return
											}
										})
										return voteResult
									})

									// Delegate user's token to vote
									try {
										// Check if the wallet still needs to delegate their tokens before they can vote
										const delegation = await tokenModule.getDelegationOf(
											address
										)
										// Ff the delegation is the 0x0 address that means they have not delegated their governance tokens yet
										if (delegation === ethers.constants.AddressZero) {
											await tokenModule.delegateTo(address)
										}
										// Vote on the proposals
										try {
											await Promise.all(
												votes.map(async (vote) => {
													// Check whether the proposal is open for voting
													// Get the latest state of the proposal
													const proposal = await voteModule.get(vote.proposalId)
													// Check if the proposal is open for voting (state === 1 means it is open)
													if (proposal.state === 1) {
														// Vote on proposal
														return voteModule.vote(vote.proposalId, vote.vote)
													}
													return
												})
											)
											try {
												// If any of the propsals are ready to be executed we'll execute them
												// a proposal is ready to be executed if it is in state 4
												await Promise.all(
													votes.map(async (vote) => {
														// Get the latest state of the proposal again, since we may have just voted before
														const proposal = await voteModule.get(
															vote.proposalId
														)

														// If the state is in state 4 (meaning that it is ready to be executed), we'll execute the proposal
														if (proposal.state === 4) {
															return voteModule.execute(vote.proposalId)
														}
													})
												)
												setHasVoted(true)

												console.log('successfully voted')
											} catch (err) {
												console.error('failed to execute votes', err)
											}
										} catch (err) {
											console.error('failed to vote', err)
										}
									} catch (err) {
										console.error('failed to delegate tokens')
									} finally {
										setIsVoting(false)
									}
								}}
							>
								{activeProposals.map((proposal, index) => (
									<div key={index} className="card">
										<h5>{proposal.description}</h5>
										<div>
											{proposal.votes.map((vote, index) => (
												<div key={index}>
													<input
														type="radio"
														id={proposal.proposalId + '-' + vote.type}
														name={proposal.proposalId}
														value={vote.type}
														// Default the "abstain" vote to checked
														defaultChecked={vote.type === 2}
													/>
													<label
														htmlFor={proposal.proposalId + '-' + vote.type}
													>
														{vote.label}
													</label>
												</div>
											))}
										</div>
									</div>
								))}
								<div className="buttonBox">
									<button disabled={isVoting} type="submit">
										{isVoting ? 'Voting...' : 'Submit Votes'}
									</button>
								</div>

								<p>
									This will trigger multiple txs that you will need to sign.
								</p>
							</form>
						</div>
					)}

					{memberTokenAmounts[address] > 0 && (
						<div>
							<h2>Propose Vote</h2>
							<div className="card">
								<p>Should the DAO transfer </p>
								<input
									id="proposal-input-amount"
									placeholder="amount"
									value={proposalInputAmount}
									onChange={(event) =>
										setProposalInputAmount(event.target.value)
									}
									onClick={() => setProposalInputAmount('')}
								/>
								<p>tokens from the treasury to </p>
								<input
									id="proposal-input-address"
									placeholder="address"
									value={proposalInputAddress}
									onChange={(event) =>
										setProposalInputAddress(event.target.value)
									}
									onClick={() => setProposalInputAddress('')}
								/>
								<p> because </p>
								<input
									id="proposal-input-reason"
									placeholder="reason"
									value={proposalInputReason}
									onChange={(event) =>
										setProposalInputReason(event.target.value)
									}
									onClick={() => setProposalInputReason('')}
								/>
							</div>
							<div className="buttonBox">
								<button type="submit" onClick={() => proposeVote()}>
									{isProposing
										? 'Proposing...'
										: hasProposed
										? 'Successfully proposed'
										: 'Propose'}
								</button>
							</div>
						</div>
					)}
				</div>

				<div>
					{votedProposals.length > 0 && (
						<div>
							<h2>Already Voted Active Proposals</h2>

							{votedProposals.map((proposal, index) => (
								<div key={index} className="card">
									<h5>{proposal.description}</h5>
									<p>
										Against:{' '}
										{Math.round(
											parseInt(proposal.votes[0].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
									<p>
										For:{' '}
										{Math.round(
											parseInt(proposal.votes[1].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
									<p>
										Abstain:{' '}
										{Math.round(
											parseInt(proposal.votes[2].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
								</div>
							))}
						</div>
					)}

					{defeatedProposals.length > 0 && (
						<div>
							<h2>Defeated Proposals</h2>

							{defeatedProposals.map((proposal, index) => (
								<div key={index} className="card">
									<h5>{proposal.description}</h5>
									<p>
										Against:{' '}
										{Math.round(
											parseInt(proposal.votes[0].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
									<p>
										For:{' '}
										{Math.round(
											parseInt(proposal.votes[1].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
									<p>
										Abstain:{' '}
										{Math.round(
											parseInt(proposal.votes[2].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
								</div>
							))}
						</div>
					)}

					{executedProposals.length > 0 && (
						<div>
							<h2>Executed Proposals</h2>

							{executedProposals.map((proposal, index) => (
								<div key={index} className="card">
									<h5>{proposal.description}</h5>
									<p>
										Against:{' '}
										{Math.round(
											parseInt(proposal.votes[0].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
									<p>
										For:{' '}
										{Math.round(
											parseInt(proposal.votes[1].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
									<p>
										Abstain:{' '}
										{Math.round(
											parseInt(proposal.votes[2].count.toString()) /
												(10 * 10 ** 17)
										)}
									</p>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		)
	}

	return (
		<div className="landing">
			<h1>Welcome to AE DAO</h1>
			<h2>Mint your free 🦋AE DAO Membership NFT</h2>
			<div>
				<button disabled={isClaiming} onClick={() => mintNft()}>
					{isClaiming ? 'Minting...' : 'Mint your nft (FREE)'}
				</button>
			</div>
			<p>*Claim free Rinkeby testnet ETH</p>
			<a href="https://faucets.chain.link/rinkeby" target="_blank">
				Rinkeby Faucet
			</a>
		</div>
	)
}

export default App

// state 7: Executed
// state 3: Defeated
// state 0: Active
