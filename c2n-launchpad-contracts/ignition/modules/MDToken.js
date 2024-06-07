// ignition/modules/MDToken.js
// Auther: @charley_cai
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");


module.exports = buildModule("MDTokenModule", (m) => {
  const ONE_MILLION = 1_000_000n;
  const totalSupply = m.getParameter("_totalSupply", ONE_MILLION);

  const MDToken = m.contract("MDToken",[totalSupply]);

  return { MDToken };
});