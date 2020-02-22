pragma solidity ^0.5.0;

import { MockToken } from "./MockToken.sol";

//Simple smart contract for testing metatransactions
contract MockVault {

	uint public counter;

	constructor() public { }

	function () external payable {
		revert("fn: fallback, msg: fallback function not allowed");
	}

	function count() public returns (bool) {
		counter += 1;
		return true;
	}
	
	//For testing parameter passing on call
	function increment(uint incr) public returns (bool) {
		counter += incr;
		return true;
	}
	
	//This contract must be "approved" to do the transfer before reach this method
	 function delegatedTransfer(
		address token,
		address fromAddress, 
		address toAddress,
		uint256 value
	)public returns (bool) {
		MockToken tokenContract = MockToken(token);
		require(value >= tokenContract.allowance(fromAddress,msg.sender),"value of tokens to transfer cannot be greater than approved token value");
		tokenContract.transferFrom(fromAddress,toAddress,value);
		emit TransferSuccessFull(token,fromAddress, toAddress,value);
		return true;
	}
	
	event TransferFailed(address token, address fromAddress, address toAddress, uint256 value);
	
	event TransferSuccessFull(address token, address fromAddress, address toAddress, uint256 value);
}