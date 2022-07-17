//const { useContractReader } = require("eth-hooks")
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { colors } = require("colors");

describe("Beneficiary Tests: ".bgYellow, function () {

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

    describe("Add and Remove Beneficiaries.", async function () {
        it("Should add a new beneficiary, get payout for new beneficiary, then remove the beneficiary and try to call 'getPayout' function.", async function () {
            const marketplaceInstance = await adaptivemarketplace.deployed();
            let marketplaceAddress = marketplaceInstance.address;
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const provider = waffle.provider;
            // add beneficiary and coop actors to bene contract
            // address, percent, description, coop
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 30, "bene1", false);
            await createBene1.wait(); // bene (addr4) @ 30%
            const createBene2 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"), 30, "COOP", true);
            await createBene2.wait(); // CO-OP (addr6) @ 30%
            // create claim
            const createMint = await adaptivemarketplace.connect(addr2).createAndMintClaim(
                "123456789",
                "QmS7hFbBk8cYoGNxBh4T9TX5bRLwu8xPuJZCcgFVFE4WZo",
                ethers.utils.parseUnits("250"),
                [
                    ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906")
                ],
                ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                'gold'
            );
            await createMint.wait();
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(1);
            //let tx = await adaptivemarketplace.getClaimInfo(1)
            //console.log(tx)
            console.log("_____ After Mint Balances _____".brightMagenta)
            console.log(" Claim Creator balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            // put on market
            const putOnMarket = await adaptivemarketplace.connect(addr2).putOnMarket(ethers.utils.hexlify(1));
            await putOnMarket.wait();
            console.log("_____ Balance After Claim Creator Puts on Market _____".brightMagenta);
            console.log(" Claim Creator balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));

            console.log("_____ Downstream Actor Buys Token _____".brightMagenta);
            await adaptivemarketplace.connect(addr3).transferFromAndPayout(1, { value: ethers.utils.parseUnits("250") });
            expect(await adaptivemarketplace.balanceOf(addr3.address)).to.equal(1);
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(0);
            console.log(" Claim Creator ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Downstream Buyer ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr3.address)));
            console.log(" Claim Token Contract Balance: ", ethers.utils.formatEther(await provider.getBalance(marketplaceAddress)));

            console.log("_____ Available Beneficiary Allowances _____".brightMagenta);
            console.log(" Beneficiary Address (CO-OP) allowance balance:: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr6).payout(addr6.address)));
            console.log(" Beneficiary Address (NGO) allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr4).payout(addr4.address)));
            console.log(" Contract Owner allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr5).payout(addr1.address)));

            console.log("_____ Beneficiaries Get Payout, New balances: _____".brightMagenta);
            let result1 = await adaptivemarketplace.connect(addr6).getPayout()
            let result2 = await adaptivemarketplace.connect(addr4).getPayout()
            let result3 = await adaptivemarketplace.connect(addr1).getPayout()
            try {
                if (result1 && result2 && result3) {
                    console.log(" Added beneficiary balance: ", ethers.utils.formatEther(await provider.getBalance(addr6.address)));
                    console.log(" (CO-OP) balance: ", ethers.utils.formatEther(await provider.getBalance(addr4.address)));
                    console.log(" Adaptive balance: ", ethers.utils.formatEther(await provider.getBalance(addr1.address)));
                }
            } catch (error) {
                // console.log(result1, result2, result3);
            }
            // check to see if the beneficairy still exists.
            console.log("_____ Remove Previously Added Beneficiary: _______".brightMagenta);
            const removeBene = await adaptivemarketplace.connect(addr1).removeBeneficiary('0x90F79bf6EB2c4f870365E785982E1f101E93b906');
            await removeBene.wait()
            try {
                let tx = await adaptivemarketplace.getBeneficiary(addr4.address)
            } catch (error) {
                console.log("Beneficiary removed.")
            }
            // creatMint2 is supposed to fail since the beneficiary that we are trying to create the token with was just removed from the list of possible beneficiaries.
            console.log("_____ Mint new Claim Token using previously removed Beneficary: _______".brightMagenta);
            try {
                const createMint2 = await adaptivemarketplace.connect(addr2).createAndMintClaim(
                    "1234567891",
                    "QmS7hFbBk8cYoGNxBh4T9TX5bRLwu8xPuJZCcgFVFE4WZZ",
                    ethers.utils.parseUnits("250"),
                    [
                        ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906")
                    ],
                    ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                    'gold');
                await createMint2.wait();
            } catch (error) {
                console.log("Mint failed with un-approved beneficiary".green);
                expect(error)
            }

            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(0);

        });
    });
});