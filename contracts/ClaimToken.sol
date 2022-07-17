//SPDX-License-Identifier: MIT
//Created by evan@adaptiveresources.io

// ERC721 token for tracking mineral claims
// transfer function exposed through marketplac contract.

pragma solidity ^0.8.4;

import "./Ownable.sol";
import "./ERC721Adaptive.sol";
import "./BeneficiaryStream.sol";
import "./Counters.sol";
import "./EnumerableSet.sol";

import "hardhat/console.sol";

contract ClaimToken is Ownable, ERC721Adaptive, BeneficiaryStream {
  using Counters for Counters.Counter;
  using EnumerableSet for EnumerableSet.AddressSet;
  Counters.Counter private _tokenIds; // Claim Token Ids global variable, no two claims will ever have same ID number
  Counters.Counter public totalClaimTokens; // Counter for total claim tokens created.

  // Initiate ERC721 Adaptive Claim Token
  constructor() ERC721Adaptive("Adaptive Claim", "AC") {}

  // ====== Events ======
  event NewClaimCreated(
    uint256 id,
    string barcodeId,
    address claimCreator,
    string propertiesHash,
    uint256 claimValue,
    string material
  );
  event Sold(uint256 tokenID, address newOwner, uint256 value);
  event PayoutCoop(address coop, uint256 amount);
  event PayoutBene(address bene, uint256 amount);
  event PayoutProtocol(uint256 amount);

  // ====== Struct ======
  struct Claim {
    uint256 Id; // ID of goldAsset relative to the totalAssets counter.
    string material; // Material examples: Gold, Tin, Lithium, Cobalt, Tantalum, ...
    string barcodeId; // Direct identifier of physical asset, can be scanable via QR to barcode. This property connects the item in real life to this struct.
    address payable claimCreator; // Address associated is the original claim creator. This value will never change while the token owner will.
    string propertiesHash; // An algorithic hash of the claim properties.
    bool onMarket; // True = for sale. False = not for sale.
    //EnumerableSet.AddressSet Beneficiaries; // Beneficiaries which can receive payouts. Can be added only by asset manager.
    address cooperative; // cooperative address associated with the claim
    uint256 claimValue; // 1/10 of the assets overal value.
  }

  // ====== Mappings ======
  mapping(string => uint256) public claimIdByBarcodeId; // Input asset barcodeId to access ID of that specific asset.
  mapping(uint256 => Claim) claimById; // Input asset ID provided from the mapping above to access asset struct.
  mapping(uint256 => address[]) public benesByTokenId; // Input token ID to return array of addresses
  mapping(uint256 => string) public assetBarcodeIdByTokenId; // Input asset ID to get barcodeId of that asset.
  mapping(string => string) public URIByBarcodeId; // Input asset barcode to get claim properties hash.

  // Create a struct for a specific asset. Internal Function.
  // Emit the tokenId for the event created. tokenId to be the totalAssets.incremented.
  function _createClaim(
    string memory barcodeId,
    address payable claimCreator,
    string memory material,
    string memory propertiesHash,
    uint256 claimValue,
    address[] memory beneAddresses,
    address payable cooperative
  ) internal returns (uint256) {
    totalClaimTokens.increment(); // Add to claim total
    uint256 id = totalClaimTokens.current(); // use current total integer as the token id
    Claim storage cm = claimById[id]; // set properties
    cm.Id = id; // set new token ID
    cm.material = material; // set material
    cm.barcodeId = barcodeId; // set barcode
    cm.claimCreator = claimCreator; // set msg.sender as claimCreator
    cm.propertiesHash = propertiesHash; // set properties hash
    cm.onMarket = false; // set not for sale
    cm.cooperative = cooperative;
    cm.claimValue = claimValue;

    claimIdByBarcodeId[barcodeId] = cm.Id; // Connect claim token ID with the physical barcode on product.
    URIByBarcodeId[barcodeId] = cm.propertiesHash;

    /*
    for (uint256 i = 0; i < beneAddresses.length; i++) {
      cm.Beneficiaries.add(beneAddresses[i]); // Add a beneficiary from pre-approved/ checked list.
    }
    */
    benesByTokenId[id] = beneAddresses;

    emit NewClaimCreated(cm.Id, cm.barcodeId, cm.claimCreator, cm.propertiesHash, cm.claimValue, cm.material);
    return (cm.Id);
  }

  // Internal function used to mint tokens for a specific event. Internal function.
  // Determine whether asset has been already minted or not. Validate inputs to the struct claim created.
  // This is taking the place of a "claims" office. This fucntion with others can validate information like the claims office.
  function _mintClaim(
    address to,
    string memory barcodeId,
    string memory propertiesHash
  ) internal returns (uint256) {
    _tokenIds.increment(); // New token ID.
    uint256 id = _tokenIds.current(); // Gets current events ID.
    assetBarcodeIdByTokenId[id] = barcodeId; // Access the specific asset after inputing the barcodeId information.

    _safeMint(to, id);
    _setTokenURI(id, propertiesHash);

    return id;
  }

  // One function to call _createClaim and _mintClaim using same barcode Id, URI, and token ID.
  // BarcodeId (attached to physical asset itself)
  // propertiesHash (IPFS string)
  // claimValue ($USD) * 10**18
  // beneAddresses (array of beneficiary addresses) --> can have either 1 or 2 address in array no more no less.
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
  ) public returns (uint256) {
    // No duplicate barcodes
    require(
      !(claimIdByBarcodeId[barcodeId] > 0),
      "This asset already exists! There is a matching barcode already in the system."
    );
    // Check if beneficiaries in array
    uint256 beneArrayLength = beneAddresses.length;
    require(
      beneArrayLength >= 1 && beneArrayLength < 3,
      "Please provide an array of beneficiaries. Maximum two beneficiaries and one coopertive allowed in claim token."
    );

    for (uint256 i = 0; i < beneArrayLength; i++) {
      require(
        beneficiaries[beneAddresses[i]].exists,
        "Beneficiary does not exist yet. Please contact the contract owner to add a beneficiary."
      );
    }

    // CREATE CLAIM STRUCT
    uint256 assetId = _createClaim(
      barcodeId,
      payable(msg.sender),
      material,
      propertiesHash,
      claimValue,
      beneAddresses,
      cooperative
    );
    require(assetId > 0, "Claim not created or minted. Try again.");

    // MINT
    string memory claimPropHash = URIByBarcodeId[barcodeId];
    if (keccak256(abi.encodePacked((claimPropHash))) == keccak256(abi.encodePacked((propertiesHash)))) {
      uint256 claimId = _mintClaim(msg.sender, barcodeId, propertiesHash);
      return claimId;
    } else {
      return (0);
    }
  }

  // * Get claim details. Public function.
  function getClaimInfo(uint256 tokenId)
    public
    view
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
    )
  {
    require(_exists(tokenId), "ERC721: operator query for nonexistent token");
    Claim storage cm = claimById[tokenId];
    return (cm.barcodeId, cm.claimCreator, cm.propertiesHash, cm.onMarket, cm.claimValue, cm.material, cm.cooperative);
  }

  // * Get claim beneficiaries. Public Function.
  function getClaimBenes(uint256 tokenId) public view returns (address[] memory benesArray) {
    require(_exists(tokenId), "ERC721: operator query for nonexistent token");
    return (benesByTokenId[tokenId]);
  }

  // BUYING a Claim Token from Adaptive marketplace or second hand.
  // onMarket & exists struct properties must be true.
  // safeTransfer from owner to caller.
  // Distributed payouts to 1 or 2 beneficiaries as well as the registered cooperative.
  // Seller always gets 30% of sale proceeds.
  function transferFromAndPayout(uint256 tokenID) public payable returns (bool) {
    require(_exists(tokenID), "ERC721: operator query for nonexistent token");
    Claim storage cm = claimById[tokenID];
    address _owner = ownerOf(tokenID);
    address coop = cm.cooperative;
    uint256 claimValue = cm.claimValue;
    require(cm.onMarket == true, "This claim token is not for sale.");
    require(msg.value >= cm.claimValue, "Value sent is not enough to pay for this claim.");
    require(msg.sender != _owner, "You currently own this token.");

    // msg.value recieved and validated, now emit the event.
    // Event lives in Beneficiary stream contract. Inherited by claim token.
    streamDeposit();

    // Payout token owner 30% claim value
    payoutTokenSeller(_owner, claimValue);
    // Payout Cooperative, 30% claim value
    payoutCooperative(coop, claimValue);
    // Payout protocol, 10% claim value
    payoutProtocol(claimValue);

    // Payout Beneficiaries, 30% for 1 Beneficiary, 15% each for 2 Beneficiaries
    // get array length, if 2 multiplier is 15. If 1, multiplier is 30.
    //uint256 beneArrayLength = EnumerableSet.length(cm.Beneficiaries);
    console.log("hi");
    address[] memory benes = benesByTokenId[tokenID];
    uint256 multiplier;
    require(benes.length < 3, "Two many beneficiaries. Only 2 max per claim.");
    if (benes.length > 1) {
      multiplier = 2;
    } else {
      multiplier = 1;
    }

    for (uint256 i = 0; i < benes.length; i++) {
      uint256 amount;
      address bene = benes[i];
      uint256 payoutPercent = beneficiaries[address(bene)].payoutPercent;
      if (multiplier == 1) {
        amount = ((payoutPercent) * claimValue) / 100;
      }
      if (multiplier == 2) {
        amount = ((payoutPercent / 2) * claimValue) / 100;
      }
      _increasePayout(bene, amount);
    }

    // Transfer claim token.
    _safeTransfer(ownerOf(tokenID), msg.sender, tokenID, "");

    // Take off marketplace
    cm.onMarket == false;

    emit Sold(tokenID, msg.sender, claimValue);

    return true;
  }

  // * Cooperative to always get 30% claim value on transfers
  function payoutCooperative(address _cooperative, uint256 _claimValue) internal {
    require(beneficiaries[_cooperative].payoutPercent == 30, "This is not a valid cooperative address.");
    // coop allowance, check payout percent, should be 30%, then add to allowance.
    uint256 payoutPercent = beneficiaries[_cooperative].payoutPercent;
    uint256 amount = (_claimValue * (payoutPercent)) / 100;
    console.log(amount);
    _increasePayout(_cooperative, amount);

    emit PayoutCoop(_cooperative, amount);
  }

  // * Protocol to receive 10% of all claim transfers
  function payoutProtocol(uint256 _claimValue) internal {
    uint256 amount = ((10) * _claimValue) / 100;

    _increasePayout(owner(), amount);

    emit PayoutProtocol(amount);
  }

  // * Token Owner, who placed the token for sale, receives 30% of the sale proceeds.
  function payoutTokenSeller(address _tokenOwner, uint256 _claimValue) internal {
    payable(_tokenOwner).transfer((_claimValue * 30) / 100);
  }
}
