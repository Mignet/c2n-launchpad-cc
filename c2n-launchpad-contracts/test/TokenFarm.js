/*
 * test/TokenFarm.js
 * @Author: charley_cai
 * @Date: 2024-05-04 15:46:17
 */
const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  
describe("TokenFarm", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
  async function deployFarmFixture() {
        const mdAmount = ethers.parseEther("1000000");
        const daiAmount = ethers.parseEther("25000");
        // Contracts are deployed using the first signer/account by default
        const [owner, alice, bob] = await ethers.getSigners();
        console.log(`Deploying contracts with ${owner.address}`);

        const MockDai = await ethers.getContractFactory("MockERC20");
        const mockDai = await MockDai.deploy("MockDai", "mDAI");
        await Promise.all([
            mockDai.mint(owner, daiAmount),
            mockDai.mint(alice, daiAmount),
            mockDai.mint(bob, daiAmount)
        ]);
        const C2NToken = await ethers.getContractFactory("C2NToken");
        const c2nToken = await C2NToken.deploy(mdAmount);
        const PmknFarm = await ethers.getContractFactory("TokenFarm");
        const c2nFarm = await PmknFarm.deploy(mockDai, c2nToken);

    return {mdAmount,daiAmount, c2nToken,mockDai, c2nFarm, owner, alice, bob };
  }

  async function deployFarmFixtureUnstack() {
    const {  mdAmount,daiAmount, c2nToken,mockDai, c2nFarm, owner, alice, bob} = await loadFixture(deployFarmFixture);
    let toTransfer =  ethers.parseEther("100")
    // console.log(`toTransfer: ${toTransfer}`)
    await mockDai.connect(alice).approve(c2nFarm, toTransfer)
    await c2nFarm.connect(alice).stake(toTransfer)
    return {mdAmount,daiAmount, c2nToken,mockDai, c2nFarm, owner, alice, bob };
  }

  async function deployFarmFixtureWithdrawYield() {
    const {  mdAmount,daiAmount, c2nToken,mockDai, c2nFarm, owner, alice, bob} = await loadFixture(deployFarmFixture);
    await c2nToken.transferOwnership(c2nFarm)
    let toTransfer = ethers.parseEther("10")
    await mockDai.connect(alice).approve(c2nFarm, toTransfer)
    await c2nFarm.connect(alice).stake(toTransfer)
    return {mdAmount,daiAmount, c2nToken,mockDai, c2nFarm, owner, alice, bob };
  }


    describe("Init", function(){
        it("Should set the right totalSupply", async function () {
            const { mdAmount,c2nToken,  owner } = await loadFixture(deployFarmFixture);
            expect(await c2nToken.balanceOf(owner)).to.equal(mdAmount);
          });
      
        it("should initialize", async function () {
            const { c2nToken, c2nFarm,mockDai } = await loadFixture(deployFarmFixture);
            expect(await c2nToken).to.be.ok
            expect(await c2nFarm).to.be.ok
            expect(await mockDai).to.be.ok
        })
    })

    describe("Stake", async() => {
        it("should accept DAI and update mapping", async() => {
            const {  c2nFarm,mockDai ,alice} = await loadFixture(deployFarmFixture);
            let toTransfer = ethers.parseEther("100")
            await mockDai.connect(alice).approve(c2nFarm, toTransfer)

            expect(await c2nFarm.isStaking(alice))
                .to.eq(false)
            expect(await c2nFarm.connect(alice).stake(toTransfer))
                .to.be.ok
            expect(await c2nFarm.stakingBalance(alice))
                .to.eq(toTransfer)
            expect(await c2nFarm.isStaking(alice))
                .to.eq(true)
        })

        it("should update balance with multiple stakes", async() => {
            const {  c2nFarm,mockDai ,alice} = await loadFixture(deployFarmFixture);
            let toTransfer = ethers.parseEther("100")
            await mockDai.connect(alice).approve(c2nFarm, toTransfer)
            await c2nFarm.connect(alice).stake(toTransfer)

            await mockDai.connect(alice).approve(c2nFarm, toTransfer)
            await c2nFarm.connect(alice).stake(toTransfer)

            expect(await c2nFarm.stakingBalance(alice))
                .to.eq(ethers.parseEther("200"))
        })

        it("should revert with not enough funds", async() => {
            const {  c2nFarm,mockDai ,bob} = await loadFixture(deployFarmFixture);
            let toTransfer = ethers.parseEther("1000000")
            await mockDai.approve(c2nFarm, toTransfer)

            await expect(c2nFarm.connect(bob).stake(toTransfer))
                .to.be.revertedWith("You cannot stake zero tokens")
        })
    })

    describe("Unstake", async() => {
        it("should unstake balance from user", async() => {
            const {  c2nFarm,alice} = await loadFixture(deployFarmFixtureUnstack);
            let toTransfer = ethers.parseEther("100")
            await c2nFarm.connect(alice).unstake(toTransfer)

            res = await c2nFarm.stakingBalance(alice)
            expect(Number(res))
                .to.eq(0)

            expect(await c2nFarm.isStaking(alice))
                .to.eq(false)
        })
    });

    describe("WithdrawYield", async() => {
        it("should return correct yield time", async() => {
            const {  c2nFarm, alice} = await loadFixture(deployFarmFixtureWithdrawYield);
            let timeStart = await c2nFarm.startTime(alice)
            expect(Number(timeStart))
                .to.be.greaterThan(0)

            // Fast-forward time
            await time.increase(86400)

            expect(await c2nFarm.calculateYieldTime(alice))
                .to.eq((86400))
        })

        it("should mint correct token amount in total supply and user", async() => { 
            const { mdAmount, c2nToken,c2nFarm,alice } = await loadFixture(deployFarmFixtureWithdrawYield);
            await time.increase(86400)

            let _time = await c2nFarm.calculateYieldTime(alice)
            let formatTime = _time / BigInt(86400)
            let staked = await c2nFarm.stakingBalance(alice)
            let bal = staked * formatTime
            let newBal = ethers.formatEther(bal)
            let expected = Number.parseFloat(newBal).toFixed(3)
            
            await c2nFarm.connect(alice).withdrawYield()
            
            res = await c2nToken.totalSupply()
            let newRes = ethers.formatEther(res)
            let formatRes = Number.parseFloat(newRes).toFixed(3).toString()

            expect(expected).not.to.eq(formatRes)

            res = await c2nToken.balanceOf(alice)
            newRes = ethers.formatEther(res)
            formatRes = Number.parseFloat(newRes).toFixed(3).toString()

            expect(expected).to.eq(formatRes)
        })

        it("should update yield balance when unstaked", async() => {
            const {  c2nToken,c2nFarm,alice } = await loadFixture(deployFarmFixtureWithdrawYield);
            await time.increase(86400)
            await c2nFarm.connect(alice).unstake(ethers.parseEther("5"))

            res = await c2nFarm.c2nBalance(alice)
            expect(Number(ethers.formatEther(res)))
                .to.be.approximately(10, .001)
        })

    });
});
  