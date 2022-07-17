//SPDX-License-Identifier: MIT
//Created by evan@adaptiveresources.io

pragma solidity ^0.8.4;

import "./Ownable.sol";

abstract contract BeneficiaryStream is Ownable {
  uint256 public totalBeneficiaries; // Total number of beneficiaries.

  constructor() {}

  // Beneficiary struct
  struct Beneficiary {
    uint256 payoutPercent; // Percent of the total claim value
    string description; // Name and location
    bool cooperative; // Is this beneficiary apart of a cooperative?
    bool exists; // Is this an active beneficiary, if exists = false, beneficiary cannot recieve payouts
  }

  // Mappings
  mapping(address => Beneficiary) public beneficiaries; // Beneficiary structs
  mapping(address => uint256) private _payoutTotals; // Beneficiaries address and how much they have earned/ accrued.
  mapping(address => mapping(string => uint256)) public directDueDiligenceSupportTasks; // Beneficiary addresses, the directed due diligence donated for, and total value donated.

  // Events
  event Withdraw(address indexed to, uint256 amount);
  event BeneAdded(address beneAddress, uint256 payoutPercent, string description, bool cooperative);
  event BeneRemoved(address beneAddress);
  event Deposit(address indexed from, uint256 amount);

  //----------------------------------------Add/ Remove Beneficiaries---------------------------------------------//
  // Only Owner can call these functions.

  // The function first checks to make sure beneficiary doesnt already exist. Then creates the struct.
  // Only the owner of the contract can call. All Beneficiaries and Cooperatives to have payout percent set to 30%.
  function addBeneficiary(
    address _beneToAdd,
    uint256 _payoutPercent,
    string memory _description,
    bool _cooperative
  ) public onlyOwner {
    // Make sure beneficiary does not exist already
    require(!beneficiaries[_beneToAdd].exists, "This Beneficiary already exists.");
    // Create beneficiary struct and set properties
    beneficiaries[_beneToAdd] = Beneficiary(_payoutPercent, _description, _cooperative, true);
    totalBeneficiaries++;
    emit BeneAdded(_beneToAdd, _payoutPercent, _description, _cooperative);
  }

  // The function first checks to make sure beneficiary doesnt already exist.
  // Then any allowance in the beneficiaries account is sent to them and the account is removed from mapping.
  // Then creates the beneficiary struct. Only the owner of the contract can call.
  function removeBeneficiary(address payable _beneToRemove) public onlyOwner returns (string memory) {
    // make sure beneficiary struct exists
    require(beneficiaries[_beneToRemove].exists, "This is not a current Beneficiary address.");
    // Check for payout. If payout exists, transfer and remove.
    if (_payoutTotals[_beneToRemove] > 0) {
      uint256 allowanceAvailable = _payoutTotals[_beneToRemove];
      _beneToRemove.transfer(allowanceAvailable);
      _decreasePayout(_beneToRemove, allowanceAvailable);
      // Change existance (remove)
      beneficiaries[_beneToRemove].exists = false;
      totalBeneficiaries--;
      emit BeneRemoved(_beneToRemove);
      return ("Remaining payout sent to beneficiary.");
    } else {
      // Change existance (remove)
      beneficiaries[_beneToRemove].exists = false;
      totalBeneficiaries--;
      emit BeneRemoved(_beneToRemove);
      return ("No payout to send to beneficiary.");
    }
  }

  // Return Benficiary details
  // Public function.
  function getBeneficiary(address beneAddress)
    public
    view
    returns (
      address,
      uint256,
      string memory
    )
  {
    // make sure beneficiary struct exists
    require(beneficiaries[beneAddress].exists, "This is not a current Beneficiary address.");
    return (beneAddress, beneficiaries[beneAddress].payoutPercent, beneficiaries[beneAddress].description);
  }

  //-----------------------------------------Beneficiary-Allowance Functions----------------------------------------//

  // Internal
  function _increasePayout(address _recipient, uint256 _addedValue) internal returns (bool) {
    uint256 currentBalance = 0;
    if (_payoutTotals[_recipient] != 0) {
      currentBalance = _payoutTotals[_recipient];
    }
    _payoutTotals[_recipient] = _addedValue + currentBalance;
    emit Deposit(_recipient, _addedValue);
    return true;
  }

  // Internal
  function _decreasePayout(address beneficiary, uint256 subtractedValue) internal returns (bool) {
    uint256 currentAllowance = _payoutTotals[beneficiary];
    require(currentAllowance >= subtractedValue, "ERC20: decreased payout below zero");
    uint256 newAllowance = currentAllowance - subtractedValue;
    _payoutTotals[beneficiary] = newAllowance;
    return true;
  }

  // Public
  function payout(address recipient) public view returns (uint256) {
    return _payoutTotals[recipient];
  }

  //-------------------------------------------Vendor-Functions-------------------------------------------------------------------------------------------//

  // A beneficiary calls function and if address is approved and has a balance, beneficiary recieves xDai in return.
  function getPayout() public returns (uint256) {
    require(
      beneficiaries[msg.sender].exists || msg.sender == owner(),
      "You must be the beneficiary to recieve their funds!"
    );
    uint256 allowanceAvailable = _payoutTotals[msg.sender];
    require(allowanceAvailable > 0, "There is no available balance to withdraw");

    if (allowanceAvailable != 0 && allowanceAvailable > 0) {
      payable(msg.sender).transfer(allowanceAvailable);
      _decreasePayout(msg.sender, allowanceAvailable);
      emit Withdraw(msg.sender, allowanceAvailable);
      return (allowanceAvailable);
    } else {
      return (allowanceAvailable);
    }
  }

  // If no beneficiaries are checked when the claim is minted, sale proceeds will be left in this contract.
  function streamWithdraw(uint256 amount) public onlyOwner {
    uint256 balance = address(this).balance;
    require(balance > 0, "There are not enough funds in the contract to fullfill request.");
    address owner = owner();
    payable(owner).transfer(amount);
    emit Withdraw(msg.sender, amount);
  }

  //----------------------------------------- Direct Due diligence Support for Beneficiaries ---------------------------------------------------------------------//

  // When called, the msg.value is deposited in the stream and a directDueDiligenceSupportTask is created.
  // Once the task is complete/ verified.Adaptive can call increaseBeneficiaryPayout to release the funds to the
  // specific beneficiary and they will be able to claim with the getPayout function.
  function directDueDiligenceSupport(address _beneRecipient, string memory _directedPurpose)
    public
    payable
    returns (bool)
  {
    require(msg.value > 0, "Please send an amount greater than 0 to be added to the beneficiaries payment stream.");
    require(beneficiaries[_beneRecipient].exists, "This is not a current Beneficiary address.");

    streamDeposit(); // emit deposit event
    // get current balance if it exists.
    uint256 donationBalance = directDueDiligenceSupportTasks[_beneRecipient][_directedPurpose];
    if (donationBalance != 0 && donationBalance > 0) {
      // add value to balance
      directDueDiligenceSupportTasks[_beneRecipient][_directedPurpose] = donationBalance + msg.value;
    } else {
      directDueDiligenceSupportTasks[_beneRecipient][_directedPurpose] = msg.value;
    }

    return (true);
  }

  // Only Owner can call this function. The purpose of this function is to allow Adaptive to manage the
  // due diligence and monitoring of the donation purpose.
  function increaseBeneficiaryPayout(address _beneRecipient, string memory _directedPurpose)
    public
    onlyOwner
    returns (bool)
  {
    require(beneficiaries[_beneRecipient].exists, "This is not a current Beneficiary address.");
    // increase beneficiaries payout stream
    _increasePayout(_beneRecipient, directDueDiligenceSupportTasks[_beneRecipient][_directedPurpose]);
    // set task to complete
    directDueDiligenceSupportTasks[_beneRecipient][_directedPurpose] = 0; // directed purpose complete value goes to zero.

    return true;
  }

  // Gets the balance of a specific task for a beneficiary address. Public Function.
  function getSupportBalance(address _beneficiary, string memory _directedPurpose) public view returns (uint256) {
    require(beneficiaries[_beneficiary].exists, "This is not a current Beneficiary address.");
    // get balance
    uint256 balance = directDueDiligenceSupportTasks[_beneficiary][_directedPurpose];
    if (balance != 0 && balance > 0) {
      return (balance);
    } else {
      return (0);
    }
  }

  // Deposit function called in recieve function which emits deposit event.
  function streamDeposit() public payable {
    emit Deposit(msg.sender, msg.value);
  }

  receive() external payable {
    streamDeposit();
  }

  fallback() external virtual {}
}
