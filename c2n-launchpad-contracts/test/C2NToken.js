/*
 * test/C2NToken.js
 * @Author: charley_cai
 * @Date: 2024-05-04 15:46:17
 */
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("C2NToken", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneMillionFixture() {
    const totalSupply = ethers.parseEther("1000000");

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("C2NToken");
    const token = await Token.deploy(totalSupply);

    return { token, totalSupply, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right totalSupply", async function () {
      const { token, totalSupply, owner } = await loadFixture(deployOneMillionFixture);
      expect(await token.balanceOf(owner)).to.equal(totalSupply);
    });

    it("Should set the right owner", async function () {
      const { token, owner } = await loadFixture(deployOneMillionFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should fail if the totalSupply is not greater than zero", async function () {
      // We don't use the fixture here because we want a different deployment
      const total = 0n;
      const Token = await ethers.getContractFactory("C2NToken");
      await expect(Token.deploy(total)).to.be.revertedWith(
        "Total supply must be greater than zero"
      );
    });
  });

  describe("Transfers", function () {
    describe("Validations", function () {

      it("Should revert with the right error if not enough tokens", async function () {
        const { token, totalSupply, owner, otherAccount } = await loadFixture(deployOneMillionFixture);

        // We use token.connect() to send a transaction from another account
        await expect(token.connect(owner).transfer(otherAccount, ethers.parseEther("2000000"))).to.be.revertedWith(
          "Not enough tokens Yet"
        );
      });

      it("Shouldn't fail if transfer to in correct amount", async function () {
        const { token, totalSupply, otherAccount } = await loadFixture(
          deployOneMillionFixture
        );

        await expect(token.transfer(otherAccount, 1_000n)).not.to.be.reverted;
      });
    });



    describe("Transfers", function () {
      it("Should transfer the funds to the other account", async function () {
        const { token, totalSupply, owner, otherAccount } = await loadFixture(
          deployOneMillionFixture
        );

        const toTransferAmount = ethers.parseEther("8888")
        await expect(token.transfer(otherAccount, toTransferAmount)).not.to.be.reverted;

        expect(await token.balanceOf(otherAccount)).to.equal(
          toTransferAmount
        );
        expect(await token.balanceOf(owner)).to.equal(
          totalSupply - toTransferAmount
        );
      });
    });
  });
});
