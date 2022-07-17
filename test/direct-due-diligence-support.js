//const { useContractReader } = require("eth-hooks")
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { colors } = require("colors");

describe("Direct Due Diligence Support: ".bgYellow, function () {

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

    describe("Send and approve due diligence support funds".bgBlue, function () {
        it("Should apply 1 ETH to a beneficiary account. Then when Adaptive has validated the due diligence purpose has been accomplished, the beneficiaries have allowances increased by the amount donated.", async function () {
            expect(await adaptivemarketplace.totalBeneficiaries()).to.equal(0);
            const marketplaceInstance = await adaptivemarketplace.deployed();
            let marketplaceAddress = marketplaceInstance.address;
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const provider = waffle.provider;
            // add beneficiary and coop actors to bene contract
            // address, percent, description, coop
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 30, "bene1", false);
            await createBene1.wait(); // bene (addr4) @ 20%
            let bal = await provider.getBalance(addr4.address);
            console.log("Beneficiary (addr4) ETH balance before donation: ", ethers.utils.formatEther(bal));
            // downstream actor sends support funds
            const createDD = await adaptivemarketplace.connect(addr3).directDueDiligenceSupport(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), "Not using mercury.", { value: ethers.utils.parseUnits('1') });
            await createDD.wait();
            // check funds recieved by contract
            expect(await provider.getBalance(marketplaceAddress)).to.equal(ethers.utils.parseEther("1"))
            console.log("Claim Token Contract Balance: ", ethers.utils.formatEther(await provider.getBalance(marketplaceAddress)))
            // approve beneficiary to recieve, increase payout
            try {
                const payoutDDP = await adaptivemarketplace.connect(addr1).increaseBeneficiaryPayout(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), "Not using mercury.");
                await payoutDDP.wait();
            } catch (error) {
                console.log(error)
                //const payoutDDP = await adaptivemarketplace.connect(addr1).increaseBeneficiaryPayout(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), "Not using mercury.");
                //await payoutDDP.wait();
            }
            expect(await provider.getBalance(marketplaceAddress)).to.equal(ethers.utils.parseEther("1"))

            const getDirectDD = await adaptivemarketplace.connect(addr4).getPayout();
            await getDirectDD.wait();

            expect(await provider.getBalance(marketplaceAddress)).to.equal(ethers.utils.parseEther("0"))

            console.log("Beneficiary (addr4) ETH balance after donation recieved", ethers.utils.formatEther(await provider.getBalance(addr4.address)))
            console.log("Re-check Claim Token Contract Balance: ", ethers.utils.formatEther(await provider.getBalance(marketplaceAddress)))
            expect(await provider.getBalance(addr4.address)).to.above(ethers.utils.parseEther("10000.9"))
        });

        it("Should apply 1 ETH to a beneficiary account. Then when Adaptive has validated the due diligence purpose has been accomplished, a non-approved account will try to claim funds.", async function () {
            expect(await adaptivemarketplace.totalBeneficiaries()).to.equal(0);
            const marketplaceInstance = await adaptivemarketplace.deployed();
            let marketplaceAddress = marketplaceInstance.address;
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const provider = waffle.provider;
            // add beneficiary and coop actors to bene contract
            // address, percent, description, coop
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 20, "bene1", false);
            await createBene1.wait(); // bene (addr4) @ 20%
            let bal = await provider.getBalance(addr4.address);
            console.log("Beneficiary (addr4) ETH balance before donation: ", ethers.utils.formatEther(bal));
            // downstream actor sends support funds
            const createDD = await adaptivemarketplace.connect(addr3).directDueDiligenceSupport(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), "Not using mercury.", { value: ethers.utils.parseUnits('1') });
            await createDD.wait();
            // check funds recieved by contract
            expect(await provider.getBalance(marketplaceAddress)).to.equal(ethers.utils.parseEther("1"))
            console.log("Claim Token Contract Balance: ", ethers.utils.formatEther(await provider.getBalance(marketplaceAddress)))
            // approve beneficiary to recieve, increase payout
            try {
                const payoutDDP = await adaptivemarketplace.connect(addr1).increaseBeneficiaryPayout(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), "Not using mercury.");
                await payoutDDP.wait();
            } catch (error) {
                console.log(error)
                //const payoutDDP = await adaptivemarketplace.connect(addr1).increaseBeneficiaryPayout(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), "Not using mercury.");
                //await payoutDDP.wait();
            }
            expect(await provider.getBalance(marketplaceAddress)).to.equal(ethers.utils.parseEther("1"))
            //connect addr5 to get addr4's payout, should revert
            try {
                const getDirectDD = await adaptivemarketplace.connect(addr5).getPayout();
                await getDirectDD.wait();
            } catch (error) {
                console.log(" Recieve funds failed. Called by wrong beneficiary".green);
                expect(error)
                expect(await provider.getBalance(marketplaceAddress)).to.equal(ethers.utils.parseEther("1"))
            }

        });

    });

});