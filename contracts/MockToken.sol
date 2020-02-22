pragma solidity ^0.5.0;

import { ERC20Detailed } from "./ERC20Detailed.sol";
import { ERC20Mintable } from "./ERC20Mintable.sol";

contract MockToken is ERC20Detailed, ERC20Mintable{

  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint _toBeMinted
  )
    public
    ERC20Detailed(_name, _symbol, _decimals)
  {
    mint(msg.sender, _toBeMinted);
  }
}
