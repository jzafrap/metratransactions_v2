const EthCrypto = require('eth-crypto');
const MetaTransactionsProvider = artifacts.require('./MetaTransactionsProvider.sol')
const MockVault = artifacts.require('./MockVault.sol')
const BigNumber = web3.utils.BN
const ERC20 = artifacts.require('./MockToken.sol')

const tokenName = 'MockToken'
const tokenSymbol = 'ERC20'
const initialTotalSupply = web3.utils.toWei('10000000000000000000')
const decimals = 18
  
let instances
contract('Testing MetaTransactions with ERC20 Tokens', function (accounts) {
  
	const [MetaTransactionProxyOwner] = accounts
	// no ETH
	const [, sender] = accounts
	//const senderPrivate= '0x6bf410ff825d07346c110c5836b33ec76e7d1ee051283937392180b732aa3aff' //Ganache-cli
	const senderPrivate= '0x9adca1fb2a301784a78b57182bc407c3ae722b47bd1cdbe929208f4227ec50ac' //Ganache v1.3.1
	// will pay the blockchain fees in behalf of the sender
	const [, , miner] = accounts
	// whoever
	const [, , , whoever] = accounts
	
	//recipient
	const [, , , , recipient] = accounts
	
  
   
  
	it('common contracts deployed', async () => {
		instances = {}
		
		instances.MetaTransactionsProvider = await MetaTransactionsProvider.new({ from: sender})
		instances.MockVaultContract = await MockVault.new({ from: whoever })
		console.log("instances.MetaTransactionsProvider:"+instances.MetaTransactionsProvider.address);
		
		 // deploy mock token
        instances.MockTokenInstance = await ERC20.new(
          tokenName,
          tokenSymbol,
          decimals,
          initialTotalSupply,
          { from: sender },
        )
        await instances.MockTokenInstance.mint(sender, web3.utils.toWei('10000'), { from: sender })
		
	})

	  
 
 
  
	describe('Test MetaTransactionsProvider.delegatedTransfer method', () => {
		let MetaTransactionProxyInstance
		let MockVaultContract
		let MockTokenInstance

		beforeEach(async () => {
			// deploy contracts
			MetaTransactionProxyInstance = instances.MetaTransactionsProvider//await MetaTransactionsProvider.new({ from: MetaTransactionProxyOwner })
			MockVaultContract = instances.MockVaultContract //await MockVault.new({ from: whoever })
			
			 // deploy mock token
			MockTokenInstance = instances.MockTokenInstance
				
		})


		it('Should be possible to approve and call without paying any fee by the sender', async () => {
	 
			const initialSenderETHBalance = await web3.eth.getBalance(sender)
			const initialMinerETHBalance = await web3.eth.getBalance(miner)

			// create the sender transaction to be sent by the proxy
			const fromAddress= sender;
			const toAddress = recipient;
			const value =  new BigNumber(1000);
			const maxValue = new BigNumber(100000000);

			let senderBalance = await MockTokenInstance.balanceOf(sender, {from: whoever});
			console.log("Mocktoken balance of sender is:" + senderBalance);

			console.log('txn for sender approve: with this and only transaction sender approve the MockContract to do transfers in their name');
			//Common pattern is doing this once, when creating account; next times, the MockContract should do the transfers in place of the sender.
			//But this trx must be payed by the sender, as ERC20 limitation that requires msg.sender as approving address.
			let approved = await MockTokenInstance.approve(MockVaultContract.address,maxValue, {from: sender});
			
			let allowance = await MockTokenInstance.allowance(sender, MockVaultContract.address, {from: whoever});
			console.log("approved allowance is:" + allowance);
			console.log("allowance is:" + allowance);
			
			// SENDER TX DATA FIELD
			const countDataTransactionField = MockVaultContract
				.contract
				.methods
				.delegatedTransfer(
					MockTokenInstance.address, 
					fromAddress,
					toAddress,
					1000
				).encodeABI()

			
			// SENDER TX NONCE FIELD (TAKEN FROM PROXY NONCE COUNTER)
			const senderBouncerNonce = parseInt(await MetaTransactionProxyInstance.nonceTracker.call(sender, {from: whoever}));

			console.log("senderBouncerNonce:"+senderBouncerNonce);
		
			const messageHash = EthCrypto.hash.keccak256(
			[
				{
					type:'string',
					value:'Signed for MetaTransaction'
				},
				{
					type:'address',
					value:MetaTransactionProxyInstance.address
				}
				,{
					type:'address',
					value:MockVaultContract.address
				},
				,{
					type:'uint256',
					value:senderBouncerNonce
				}
			]);
		
			const signature = EthCrypto.sign(senderPrivate, messageHash);	
			const vrs = EthCrypto.vrs.fromString(signature);

			console.log("CALLING PARAMS:");
			console.log("sender:"+sender);
			console.log("MockValutContract.address:"+MockVaultContract.address);
			console.log("countDataTransactionField:"+countDataTransactionField);
			console.log("v:"+vrs.v);
			console.log("r:"+vrs.r);
			console.log("s:"+vrs.s);

		
			const forwardGasEstimation = new BigNumber(
				await MetaTransactionProxyInstance.callViaProxyDelegated.estimateGas(
					//MockTokenInstance.address,
					//value,
					sender,
					MockVaultContract.address,
					countDataTransactionField,
					vrs.v, vrs.r, vrs.s,
					{from: miner}			  
				)
			)
		  
			console.log("callViaProxyDelegated GasEstimation:"+forwardGasEstimation);
		  
			const result =  await MetaTransactionProxyInstance.callViaProxyDelegated(
				//MockTokenInstance.address,
				//value,
				sender,
				MockVaultContract.address,
				countDataTransactionField,
				vrs.v, vrs.r, vrs.s,
				{from: miner}			  
			)
			console.log("result of call:"+result);

					
			const finalSenderETHBalance = await web3.eth.getBalance(sender)
			const finalMinerETHBalance = await web3.eth.getBalance(miner)
		  
			console.log("sender initial ETH Balance:"+initialSenderETHBalance+", final ETH Balance:"+finalSenderETHBalance);
			console.log("miner initial ETH Balance:"+initialMinerETHBalance+", final ETH Balance:"+finalMinerETHBalance);
		  
			//expect(finalSenderETHBalance).to.equal(initialSenderETHBalance)
		
			 const finalRecipientAddressTokenBalance = await MockTokenInstance.balanceOf(toAddress, { from: whoever })
			 console.log("final toAddress token balance:"+finalRecipientAddressTokenBalance); 
			
		})
	})
})
	  

