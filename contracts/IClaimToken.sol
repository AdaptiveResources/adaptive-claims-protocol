//SPDX-License-Identifier: MIT
//Created by evan@adaptiveresources.io

pragma solidity ^0.8.4;

interface IClaimToken {
  // One function to call _createClaim and _mintClaim using same barcode Id, URI, and token ID.
  // BarcodeId (attached to asset itself)
  // propertiesHash (string)
  // claimValue ($USD)*10**18
  // beneAddresses (array of beneficiary addresses) --> must be either 1 or 2 address in array no more no less.
  // material (commodity type)
  function createAndMintClaim(
    string memory barcodeId,
    string memory propertiesHash,
    //string[] memory commodities,
    //uint256[] memory purities,
    uint256 claimValue,
    address[] memory beneAddresses,
    address payable cooperative,
    string memory material
  ) external returns (uint256);

  // * Get claim details. Public function.
  function getClaimInfo(uint256 tokenId)
    external
    returns (
      string memory barcodeId,
      address payable claimCreator,
      string memory propertiesHash,
      bool onMarket,
      //string[] memory commodities,
      //uint256[] memory purities,
      uint256 claimValue,
      string memory material,
      address cooperative
    );

  // * Get claim beneficiaries. Public Function.
  function getClaimBenes(uint256 tokenId) external returns (address[] memory benesArray);

  // BUYING a Claim Token from Adaptive marketplace or second hand.
  // onMarket & exists struct properties must be true.
  // safeTransfer from owner to caller.
  // Distributed payouts to 1 or 2 beneficiaries as well as the registered cooperative.
  // Seller always gets 30% of sale proceeds.
  function transferFromAndPayout(uint256 tokenID) external returns (bool);

  // Public
  function payout(address recipient) external returns (uint256);

  // A beneficiary calls function and if address is approved and has a balance, beneficiary recieves xDai in return.
  function getPayout() external returns (uint256);
}
