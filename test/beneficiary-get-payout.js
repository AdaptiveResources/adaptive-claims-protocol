//const { useContractReader } = require("eth-hooks")
const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { colors } = require("colors");
const { hexlify } = require("ethers/lib/utils");

describe("Beneficiary Get Payout: ".bgYellow, function () {
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

    describe("Create claim token with one beneficiary and sell on marketplace.".bgBlue, async function () {
        it("Addr2 Should create a claim token and sell token on marketplace to Addr3. Downstream buyer buys the claim token. After, the beneficiary and co-op accounts can claim their allowances.", async function () {
            const marketplaceInstance = await adaptivemarketplace.deployed();
            let marketplaceAddress = marketplaceInstance.address;
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const provider = waffle.provider;
            // add beneficiary and coop actors to bene contract
            // address, percent, description, coop
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 30, "bene1", false);
            await createBene1.wait(); // bene (addr4) @ 30%
            const createBene2 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"), 30, "coop1", true);
            await createBene2.wait(); // CO-OP (addr6) @ 30%

            // addr2 is claim creator
            const createMint = await adaptivemarketplace.connect(addr2).createAndMintClaim(
                "123456789",
                "QmS7hFbBk8cYoGNxBh4T9TX5bRLwu8xPuJZCcgFVFE4WZo",
                ethers.utils.parseEther("250"),
                [
                    ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906")
                ],
                ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                'gold'
            );
            await createMint.wait();
            console.log("_____ After Mint Balances _____".brightCyan)
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(1);
            console.log(" Claim Creator ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Claim Creator NFT balance: ", ethers.utils.formatUnits(await adaptivemarketplace.balanceOf(addr2.address), 0));
            // claim creator (addr2) puts on marketplace
            const putOnMarket = await adaptivemarketplace.connect(addr2).putOnMarket(ethers.utils.hexlify(1));
            await putOnMarket.wait();
            console.log("_____ After Put on Market Balances_____".brightCyan);
            console.log(" Claim Creator ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Claim Creator NFT balance: ", ethers.utils.formatUnits(await adaptivemarketplace.balanceOf(addr2.address), 0));
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(1);
            // downstream actor buys claim token id 1
            console.log("_____ Downstream Actor Buys Claim Token _____".brightCyan);
            let tx = await adaptivemarketplace.connect(addr3).transferFromAndPayout(1, { value: ethers.utils.parseEther("250") });
            if (tx) console.log("Claim Token Bought by " + addr3.address)
            expect(await adaptivemarketplace.balanceOf(addr3.address)).to.equal(1);
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(0);
            console.log(" Claim Creator ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Downstream Actor ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr3.address)));
            console.log(" Claim Token Contract Balance : ", ethers.utils.formatEther(await provider.getBalance(marketplaceAddress)));
            // check beneficiary allowances
            console.log("_____ Available Beneficiary Allowances _____".brightCyan);
            console.log(" Beneficiary Address (NGO) allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr4).payout(addr4.address)));
            console.log(" Beneficiary Address (CO-OP) allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr6).payout(addr6.address)));
            console.log(" Adaptive allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr1).payout(addr1.address)));
            // payout allowances
            console.log("_____ Beneficiaries Get Payout, New balances: _____".brightCyan);
            let result1 = await adaptivemarketplace.connect(addr4).getPayout()
            let result2 = await adaptivemarketplace.connect(addr6).getPayout()
            let result3 = await adaptivemarketplace.connect(addr1).getPayout()
            if (result1 && result2 && result3) {
                console.log(" Beneficiary Address (NGO) new balance: ", ethers.utils.formatEther(await provider.getBalance(addr4.address)));
                console.log(" Beneficiary Address (CO-OP) new balance: ", ethers.utils.formatEther(await provider.getBalance(addr6.address)));
                console.log(" Adaptive new balance: ", ethers.utils.formatEther(await provider.getBalance(addr1.address)));
            }
            else
                console.log("_____ Check Allowances Again After Payout Received: ______".brightCyan)
            console.log(" Beneficiary Address (NGO) allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr4).payout(addr4.address)));
            console.log(" Beneficiary Address (CO-OP) allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr6).payout(addr6.address)));
            console.log(" Adaptive allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr1).payout(addr1.address)));
        });
    });

    describe("Create claim token with 2 beneficiaries and sell on marketplace.".bgBlue, async function () {
        it("Addr2 should create a claim token, and sell token to a downstream buyer. After the two beneficairies and the co-op can claim their allowances.", async function () {
            const marketplaceInstance = await adaptivemarketplace.deployed();
            let marketplaceAddress = marketplaceInstance.address;
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const provider = waffle.provider;
            // add beneficiary and coop actors to bene contract
            // address, percent, description, coop
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 30, "bene1", false);
            await createBene1.wait(); // bene (addr4) @ 30%
            const createBene2 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"), 30, "bene2", false);
            await createBene2.wait(); // bene (addr5) @ 30%
            const createBene3 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"), 30, "COOP", true);
            await createBene3.wait(); // CO-OP (addr6) @ 30%
            //mint claim token with two beneficiaries and one co-op
            const createMint = await adaptivemarketplace.connect(addr2).createAndMintClaim(
                "123456789",
                "QmS7hFbBk8cYoGNxBh4T9TX5bRLwu8xPuJZCcgFVFE4WZo",
                ethers.utils.parseUnits("250"),
                [
                    ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"),
                    ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65")
                ],
                ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                'gold'
            );
            await createMint.wait();
            console.log("_____ After Mint Balances _____".cyan)
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(1);
            console.log(" Claim Creator ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Claim Creator NFT balance: ", ethers.utils.formatUnits(await adaptivemarketplace.balanceOf(addr2.address), 0));
            //check beneficiaries
            console.log("_____ Beneficiaries _____".cyan);
            console.log("tokenId 1 Beneficiaries: ", await adaptivemarketplace.connect(addr1).getClaimBenes(1));
            // addr2 puts claim token on market
            const putOnMarket = await adaptivemarketplace.connect(addr2).putOnMarket(ethers.utils.hexlify(1));
            await putOnMarket.wait();
            console.log("_____ After Put on Market Balances _____".cyan);
            console.log(" Claim Creator ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Claim Creator NFT balance: ", ethers.utils.formatUnits(await adaptivemarketplace.balanceOf(addr2.address), 0));
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(1);
            // downstream actor buys claim ID 1
            console.log("_____ Downstream Actor Buys Claim Token _____".cyan);
            let tx = await adaptivemarketplace.connect(addr3).transferFromAndPayout(1, { value: ethers.utils.parseUnits("250") });
            if (tx) console.log("Claim Token Bought by " + addr3.address)
            expect(await adaptivemarketplace.balanceOf(addr3.address)).to.equal(1);
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(0);
            console.log(" Claim Creator ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Downstream Actor ETH balance: ", ethers.utils.formatEther(await provider.getBalance(addr3.address)));
            console.log(" Claim Token Contract Balance : ", ethers.utils.formatEther(await provider.getBalance(marketplaceAddress)));

            console.log("_____ After sold to downstream to addr3 (downstream buyer) _____".cyan);
            console.log(" Claim Creator balance: ", ethers.utils.formatEther(await provider.getBalance(addr2.address)));
            console.log(" Downstream Buyer balance: ", ethers.utils.formatEther(await provider.getBalance(addr3.address)));
            console.log(" adaptivemarketplace contract balance : ", ethers.utils.formatEther(await provider.getBalance(marketplaceAddress)));
            // check allowances
            console.log("_______ Available Beneficiary Allowances ______".cyan);
            const checkPayout1 = await adaptivemarketplace.connect(addr4).payout(addr4.address);
            console.log("NGO1 payout", parseInt(checkPayout1) / 10 ** 18)
            const checkPayout2 = await adaptivemarketplace.connect(addr5).payout(addr5.address);
            console.log("NGO2 payout", parseInt(checkPayout2) / 10 ** 18)
            const checkPayout3 = await adaptivemarketplace.connect(addr6).payout(addr6.address);
            console.log("COOP payout", parseInt(checkPayout3) / 10 ** 18)
            const checkPayout4 = await adaptivemarketplace.connect(addr1).payout(addr1.address);
            console.log("Adaptive", parseInt(checkPayout4) / 10 ** 18)
            // payout allowances
            console.log("_____ Beneficiaries Get Payout, New balances: _____".cyan);
            let result1 = await adaptivemarketplace.connect(addr4).getPayout()
            let result2 = await adaptivemarketplace.connect(addr6).getPayout()
            let result3 = await adaptivemarketplace.connect(addr1).getPayout()
            try {
                if (result1 && result2 && result3) {
                    console.log(" Beneficiary Address (NGO) new balance: ", ethers.utils.formatEther(await provider.getBalance(addr4.address)));
                    console.log(" Beneficiary Address (CO-OP) new balance: ", ethers.utils.formatEther(await provider.getBalance(addr6.address)));
                    console.log(" Adaptive new balance: ", ethers.utils.formatEther(await provider.getBalance(addr1.address)));
                }
            } catch (error) {
                console.error(result1, result2, result3);
            }
            // re-check allowances to verify they are zero
            console.log("_____ Check Allowances Again After Payout Received: ______".cyan)
            console.log(" Beneficiary Address (NGO) allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr4).payout(addr4.address)));
            console.log(" Beneficiary Address (CO-OP) allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr6).payout(addr6.address)));
            console.log(" Adaptive allowance balance: ", ethers.utils.formatEther(await adaptivemarketplace.connect(addr1).payout(addr1.address)));
        });
    });


    describe("Create claim token with 3 beneficiaries. Should revert, due to max of two beneficiaries and one cooperative per claim.".bgBlue, async function () {
        it("Add three beneficiaries and a cooperative to the approved beneficiaries. Then, addr2 tries to create a claim and transaction should revert.", async function () {
            const marketplaceInstance = await adaptivemarketplace.deployed();
            let marketplaceAddress = marketplaceInstance.address;
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const provider = waffle.provider;
            // add beneficiary and coop actors to bene contract
            // address, percent, description, coop
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 30, "bene1", false);
            await createBene1.wait(); // bene (addr4) @ 20%
            const createBene2 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"), 30, "bene2", false);
            await createBene2.wait(); // bene (addr5) @ 20%
            const createBene3 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x976EA74026E726554dB657fA54763abd0C3a0aa9"), 30, "bene2", false);
            await createBene3.wait(); // bene (addr7) @ 20%
            const createBene4 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"), 30, "COOP", true);
            await createBene4.wait(); // CO-OP (addr6) @ 20%
            //mint claim token with two beneficiaries and one co-op
            console.log(await adaptivemarketplace.balanceOf(addr2.address))
            try {
                const createMint = await adaptivemarketplace.connect(addr2).createAndMintClaim(
                    "123456789",
                    "QmS7hFbBk8cYoGNxBh4T9TX5bRLwu8xPuJZCcgFVFE4WZo",
                    ethers.utils.parseUnits("250"),
                    [
                        ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"),
                        ethers.utils.getAddress("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"),
                        ethers.utils.getAddress("0x976EA74026E726554dB657fA54763abd0C3a0aa9")
                    ],
                    ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                    'gold'
                );
                await createMint.wait();
            } catch (error) {
                console.log("Failed to mint with three beneficiaries and one cooperative.".green)
                expect(error)
            }
            console.log(await adaptivemarketplace.balanceOf(addr2.address))
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(hexlify(0))
        });
    });

    describe("Try to creat a claim with a beneficiary address which is not approved.".bgBlue, async function () {
        it("Add one beneficiaries and a cooperative to the approved beneficiaries. Then, addr2 tries to create a claim with two beneficiaries and transaction should revert.", async function () {
            const marketplaceInstance = await adaptivemarketplace.deployed();
            let marketplaceAddress = marketplaceInstance.address;
            let addr1, addr2, addr3, addr4, addr5, addr6;
            [addr1, addr2, addr3, addr4, addr5, addr6, _] = await ethers.getSigners();
            const provider = waffle.provider;
            // add beneficiary and coop actors to bene contract
            // address, percent, description, coop
            const createBene1 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"), 20, "bene1", false);
            await createBene1.wait(); // bene (addr4) @ 20%
            const createBene4 = await adaptivemarketplace.connect(addr1).addBeneficiary(ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"), 20, "bene3", true);
            await createBene4.wait(); // CO-OP (addr6) @ 20%
            //mint claim token with two beneficiaries and one co-op
            try {
                const createMint = await adaptivemarketplace.connect(addr2).createAndMintClaim(
                    "123456789",
                    "QmS7hFbBk8cYoGNxBh4T9TX5bRLwu8xPuJZCcgFVFE4WZo",
                    ethers.utils.parseUnits("250"),
                    [
                        ethers.utils.getAddress("0x90F79bf6EB2c4f870365E785982E1f101E93b906"),
                        ethers.utils.getAddress("0x9E67029403675Ee18777Ed38F9C1C5c75F7B34f2"), // powvt.eth
                    ],
                    ethers.utils.getAddress("0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"),
                    'gold'
                );
                await createMint.wait();
            } catch (error) {
                console.log("Failed to mint with one unapproved beneficiary in beneficiaries array.".green)
                expect(error)
            }
            expect(await adaptivemarketplace.balanceOf(addr2.address)).to.equal(hexlify(0))
        });
    });


});