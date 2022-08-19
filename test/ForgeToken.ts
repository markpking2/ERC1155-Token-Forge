import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
require("@nomicfoundation/hardhat-chai-matchers");
import { ethers, network } from "hardhat";

describe("ForgeToken contract", function () {
  async function deployFixture(autoSetAddress = true) {
    const TokenFactory = await ethers.getContractFactory("ForgeToken");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const ForgeToken = await TokenFactory.deploy();
    await ForgeToken.deployed();

    const ForgeFactory = await ethers.getContractFactory("Forge");
    const Forge = await ForgeFactory.deploy(ForgeToken.address);
    await Forge.deployed();

    if (autoSetAddress) {
      await ForgeToken.setForgeAddress(Forge.address);
    }

    return {
      owner,
      addr1,
      addr2,
      ForgeToken,
      Forge,
    };
  }

  async function dfNoAddress() {
    return await deployFixture(false);
  }

  it("sets forge address", async () => {
    const { ForgeToken, Forge } = await loadFixture(dfNoAddress);
    await ForgeToken.setForgeAddress(Forge.address);
    expect(await ForgeToken.forgeAddress()).to.equal(Forge.address);
  });

  describe("minting", function () {
    it("can't mint to anyone if not owner or forge contract", async () => {
      const { ForgeToken, addr1 } = await loadFixture(deployFixture);

      await expect(
        ForgeToken.connect(addr1)["mint(address,uint256,uint256)"](
          addr1.address,
          1,
          100
        )
      ).to.be.revertedWith("cannot mint");
    });

    it("can mint to anyone if forge contract", async () => {
      const { ForgeToken, Forge, addr1 } = await loadFixture(deployFixture);

      await addr1.sendTransaction({
        to: Forge.address,
        value: ethers.utils.parseEther("1"),
      });

      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [Forge.address],
      });

      const signer = await ethers.getSigner(Forge.address);

      await ForgeToken.connect(signer)["mint(address,uint256,uint256)"](
        addr1.address,
        1,
        100
      );

      expect(await ForgeToken.balanceOf(addr1.address, 1)).to.equal(100);

      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [Forge.address],
      });
    });

    it("can mint to anyone if owner", async () => {
      const { ForgeToken, owner, addr1 } = await loadFixture(deployFixture);

      await ForgeToken.connect(owner)["mint(address,uint256,uint256)"](
        addr1.address,
        1,
        100
      );

      expect(await ForgeToken.balanceOf(addr1.address, 1)).to.equal(100);
    });

    it("anyone can mint with tokens 0 - 2", async () => {
      const { ForgeToken, addr1 } = await loadFixture(deployFixture);

      await ForgeToken.connect(addr1)["mint(uint256)"](2);

      expect(await ForgeToken.balanceOf(addr1.address, 2)).to.equal(1);
    });

    it("tokens 0 - 2 each have a 1 min cooldown", async () => {
      const { ForgeToken, addr1 } = await loadFixture(deployFixture);

      await ForgeToken.connect(addr1)["mint(uint256)"](0);
      await ForgeToken.connect(addr1)["mint(uint256)"](1);
      await ForgeToken.connect(addr1)["mint(uint256)"](2);

      await expect(
        ForgeToken.connect(addr1)["mint(uint256)"](2)
      ).to.be.revertedWith("tokens 0 - 2 each have a 1 min mint cooldown");
    });
  });

  it("can mint to anyone if owner", async () => {
    const { ForgeToken, owner, addr1 } = await loadFixture(deployFixture);

    await ForgeToken.connect(owner)["mint(address,uint256,uint256)"](
      addr1.address,
      1,
      100
    );

    expect(await ForgeToken.balanceOf(addr1.address, 1)).to.equal(100);
  });

  it("forge contract can burn tokens", async () => {
    const { ForgeToken, Forge, addr1 } = await loadFixture(deployFixture);

    await addr1.sendTransaction({
      to: Forge.address,
      value: ethers.utils.parseEther("1"),
    });

    await ForgeToken.connect(addr1)["mint(uint256)"](0);
    await ForgeToken.connect(addr1)["mint(uint256)"](1);
    await ForgeToken.connect(addr1)["mint(uint256)"](2);

    expect(await ForgeToken.balanceOf(addr1.address, 0)).to.equal(1);
    expect(await ForgeToken.balanceOf(addr1.address, 1)).to.equal(1);
    expect(await ForgeToken.balanceOf(addr1.address, 2)).to.equal(1);

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [Forge.address],
    });

    const signer = await ethers.getSigner(Forge.address);

    await ForgeToken.connect(signer).burnBatch(
      addr1.address,
      [0, 1, 2],
      [1, 1, 1]
    );

    expect(await ForgeToken.balanceOf(addr1.address, 0)).to.equal(0);
    expect(await ForgeToken.balanceOf(addr1.address, 1)).to.equal(0);
    expect(await ForgeToken.balanceOf(addr1.address, 2)).to.equal(0);

    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [Forge.address],
    });
  });
});
