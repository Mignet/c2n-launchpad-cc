// ignition/modules/TokenFarm.js
// Auther: @charley_cai
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");


module.exports = buildModule("TokenFarmModule", (m) => {
  const ONE_MILLION = 1_000_000n;
  const totalSupply = m.getParameter("_totalSupply", ONE_MILLION);

  const c2nToken = m.contract("C2NToken",[totalSupply]);
  const mockDai = m.contract("MockERC20",["MockDai", "mDAI"]);
  const tokenFarm = m.contract("TokenFarm", [mockDai,c2nToken]);

  c2nToken.transferOwnership(tokenFarm)
  console.log(`PmknToken ownership transferred to ${tokenFarm.address}`)

  return { tokenFarm };
});