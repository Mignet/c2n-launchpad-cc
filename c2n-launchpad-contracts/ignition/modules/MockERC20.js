// ignition/modules/MockERC20.js
// Auther: @charley_cai
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");


module.exports = buildModule("MockERC20Module", (m) => {

  const MockERC20 = m.contract("MockERC20",["MockDai", "mDAI"]);

  return { MockERC20 };
});