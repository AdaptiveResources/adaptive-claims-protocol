//SPDX-License-Identifier: MIT
//Created by evan@adaptiveresources.io

// Adaptive marketplace, for use with the adaptive claims token.
// To transfer a claim token, the user must call the function `transferFromAndPayout`. There is no other exposed method

pragma solidity ^0.8.4;

import "./Ownable.sol";
import "./ClaimToken.sol";
import "./EnumerableSet.sol";

contract AdaptiveMarketplace is Ownable, ClaimToken {
  using EnumerableSet for EnumerableSet.AddressSet;

  constructor() {}

  // Events
  event OnMarket(uint256 tokenID, address claimOwner);
  event OffMarket(uint256 tokenID, address claimOwner);
  event Attest(uint256 tokenId, address sender);
  event ValueChanged(uint256 tokenId, uint256 newValue, address sender);

  // Mappings
  mapping(uint256 => address) public attestations; // Input a tokenId and see if it has been attested to

  // 3rd party claim validation.
  // Input a hash sting and your address will be stored in the attestations mapping with the corresponding hash.
  function attest(uint256 _tokenId) public {
    attestations[_tokenId] = msg.sender;
    emit Attest(_tokenId, msg.sender);
  }

  // Sell a claim on Adaptive marketplace, which you are the current owner of.
  function putOnMarket(uint256 tokenId) public {
    require(ownerOf(tokenId) == msg.sender, "You are not the owner of this token");

    Claim storage cm = claimById[tokenId];
    cm.onMarket = true;
    emit OnMarket(tokenId, msg.sender);
  }

  // Remove a claim from Adaptive marketplace, which you are the current owner of.
  function takeOffMarket(uint256 tokenId) public {
    require(ownerOf(tokenId) == msg.sender, "You are not the owner of this token");
    Claim storage cm = claimById[tokenId];
    require(cm.onMarket == true, "Token not for sale.");
    // remove from for sale
    cm.onMarket = false;
    emit OffMarket(tokenId, msg.sender);
  }

  // Change the 'claim value' of a specific token. Caller of this function must be the original 'claim creator' recorded in the claim itself.
  function changeClaimValue(uint256 tokenId, uint256 newValue) public {
    require(_exists(tokenId), "ERC721: operator query for nonexistent token");
    Claim storage cm = claimById[tokenId];
    require(cm.claimCreator == msg.sender, "You did not create this token. Value cannot be changed");

    cm.claimValue = newValue;
    emit ValueChanged(tokenId, newValue, msg.sender);
  }

  // Get the 'claim value' of a specific token. Public Function
  function getClaimValue(uint256 tokenId) public view returns (uint256) {
    require(_exists(tokenId), "ERC721: operator query for nonexistent token");
    Claim storage cm = claimById[tokenId];
    uint256 value = cm.claimValue;
    return (value);
  }

  // buy claim from marketplace
  function buyClaim(uint256 _tokenId) public payable {
    transferFromAndPayout(_tokenId);

    emit OffMarket(_tokenId, msg.sender);
  }
}
