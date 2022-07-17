const { expect } = require("chai");
const { ethers } = require("hardhat");
const { colors } = require("colors");

describe("Create Claim Token Tests: ".bgYellow, function () {
    beforeEach(async function () {
        Address = await ethers.getContractFactory("Address");
        address = await Address.deploy();
        await address.deployed();

        Counters = await ethers.getContractFactory("Counters");
        counters = await Counters.deploy();
        await counters.deployed();

        EnumerableSet = await ethers.getContractFactory("EnumerableSet");
        enumerableset = await EnumerableSet.deploy();
        await enumerableset.deployed();

        Strings = await ethers.getContractFactory("Strings");
        strings = await Strings.deploy();
        await strings.deployed();

        ClaimToken = await ethers.getContractFactory("ClaimToken");
        claimtoken = await ClaimToken.deploy();
        await claimtoken.deployed();

        AdaptiveMarketplace = await ethers.getContractFactory("AdaptiveMarketplace");
        adaptivemarketplace = await AdaptiveMarketplace.deploy();
        await adaptivemarketplace.deployed();
    });

    describe(" Deployment".brightCyan, function () {
        it("Should check if the total beneficiaries after deploy is 0.", async function () {
            expect(await adaptivemarketplace.totalBeneficiaries()).to.equal(0);
        });
    });

    describe(" Add Beneficiary".brightCyan, async function () {
        it("Should add beneficiary, and total will be 1.", async function () {
            const addBeneficiary = await adaptivemarketplace.addBeneficiary("0x90F79bf6EB2c4f870365E785982E1f101E93b906", 20, "Bene1", false);
            await addBeneficiary.wait();
            expect(await adaptivemarketplace.totalBeneficiaries()).to.equal(1);

            let tx = await adaptivemarketplace.getBeneficiary("0x90F79bf6EB2c4f870365E785982E1f101E93b906");
            //console.log(tx)
            expect(tx[2]).to.equal("Bene1")
        });
    });

    describe(" Remove Beneficiary".brightCyan, async function () {
        it("Should remove a recently added beneficiary and total will be 0.", async function () {
            const addBeneficiary = await adaptivemarketplace.addBeneficiary("0x90F79bf6EB2c4f870365E785982E1f101E93b906", 20, "Bene1", false);
            await addBeneficiary.wait();
            expect(await adaptivemarketplace.totalBeneficiaries()).to.equal(1);
            let tx = await adaptivemarketplace.getBeneficiary("0x90F79bf6EB2c4f870365E785982E1f101E93b906");
            //console.log(tx)
            expect(tx[2]).to.equal("Bene1");

            const removeBeneficiary = await adaptivemarketplace.removeBeneficiary("0x90F79bf6EB2c4f870365E785982E1f101E93b906");
            await removeBeneficiary.wait();
            expect(await adaptivemarketplace.totalBeneficiaries()).to.equal(0);
        });
    });

    describe(" Create Claim".brightCyan, async function () {
        it("Should create a claim token", async function () {
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 30, "bene1", false);
            await createBene1.wait(); //NGO1
            const createBene2 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"), 30, "bene2", false);
            await createBene2.wait(); //NGO2
            const createCoop = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"), 30, "coop", true);
            await createCoop.wait(); //Coop
            //create token
            const createMint = await adaptivemarketplace.createAndMintClaim(
                '123456789',
                "propertiesHash",
                ethers.utils.hexlify(250),
                [
                    ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"),
                    ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65")
                ],
                ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                'gold');
            await createMint.wait();

            expect(await adaptivemarketplace.totalClaimTokens()).to.equal(ethers.utils.hexlify(1));
        });
    });

});