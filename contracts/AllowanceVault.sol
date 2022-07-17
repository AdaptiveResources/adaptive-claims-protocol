//SPDX-License-Identifier: MIT
//Created by evan@adaptiveresources.io

pragma solidity ^0.8.4;

// The allowance vault is for the purpose of withdrawing funds stored in the
// Adaptive beneficiary allowances on GNosis Chain and bridging the assets to mainnet via
// the contract owner.
//
// Everytime a beneficiary calls retrieve funds in the Adaptive app, the funds will be sent to
// this contract and the only person who will be able to withdraw them is the contract owner.

import "./Ownable.sol";
import "./IClaimToken.sol";

contract AllowanceVault is Ownable {
  // Events
  event FundsRecieved(uint256 amount, address beneficiaryReciever);

  // Mappings
  mapping(address => uint256) public balances; // Input a bene address to see withdrawal amount

  constructor() {}

  // 3rd party claim validation.
  // Input a hash sting and your address will be stored in the attestations mapping with the corresponding hash.
  function withdraw(uint256 amount, address beneAddress) public onlyOwner {
    balances[beneAddress] = amount;
    emit FundsRecieved(amount, beneAddress);
  }
}
