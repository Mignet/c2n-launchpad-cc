// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./C2NToken.sol";

contract TokenFarm {

    // userAddress => stakingBalance
    mapping(address => uint256) public stakingBalance;
    // userAddress => isStaking boolean
    mapping(address => bool) public isStaking;

    /** 
     * startTime 将跟踪用户地址的时间戳，以跟踪用户未实现的收益。 
     */
    // userAddress => timeStamp
    mapping(address => uint256) public startTime;
    /**
     * c2nBalance 将指向与用户地址相关的已实现或等待铸造的存储量 MdToken 收益率（不要与实际铸造的 MdToken 混淆）。
     * @notice 计算用户未实现的收益
     */
    // userAddress => c2nBalance
    mapping(address => uint256) public c2nBalance;
    /**
     * @notice 合约名称，便于测试
     */
    string public name = "TokenFarm";

    IERC20 public daiToken;
    C2NToken public c2nToken;

    event Stake(address indexed from, uint256 amount);
    event Unstake(address indexed from, uint256 amount);
    event YieldWithdraw(address indexed to, uint256 amount);

    constructor(
        IERC20 _daiToken,
        C2NToken _c2nToken
        ) {
            daiToken = _daiToken;
            c2nToken = _c2nToken;
        }

    /// Core function shells
    /**
     * 首先要求 amount 参数大于 0，并且用户持有足够的 DAI 来支付交易。
     * 条件 if 语句检查用户是否已经质押了 DAI。如果是这样，合约会将未实现的收益率添加到 c2nBalance 中。
     * 这确保了应计收益不会消失。
     * 之后，合约调用 IERC20 transferFrom 函数。用户首先必须批准合约的转移资金请求。此后，用户必须对实际交易进行签名。
     * 该函数更新 stakingBalance、startTime 和 isStaking 映射。最后，它发出 Stake 事件，让我们的前端能够轻松监听所述事件。
     * @param amount 用户想要质押的 DAI 数量
     */
    function stake(uint256 amount) public {
        require(
            amount > 0 &&
            daiToken.balanceOf(msg.sender) >= amount, 
            "You cannot stake zero tokens");
            
        if(isStaking[msg.sender] == true){
            uint256 toTransfer = calculateYieldTotal(msg.sender);
            c2nBalance[msg.sender] += toTransfer;
        }

        daiToken.transferFrom(msg.sender, address(this), amount);
        stakingBalance[msg.sender] += amount;
        startTime[msg.sender] = block.timestamp;
        isStaking[msg.sender] = true;
        emit Stake(msg.sender, amount);
    }
    /**
     * 函数要求 isStaking = true（仅在调用 stake 函数时发生），并要求请求的 unstake 金额不大于用户的质押余额。
     * 我声明了一个等于 calculateYieldTotal 函数（稍后会详细介绍此函数）的本地 toTransfer 变量，以简化我的测试（延迟给我在检查余额时带来了问题）。
     * 此后，我们遵循检查-效果-交易模式，checks-effects-transactions,将 balanceTransfer 设置为等于金额，然后将金额设置为 0。这样可以防止用户滥用该功能进行重入。
     * 随后，该逻辑更新 stakingBalance 映射并将 DAI 传输回用户。
     * 接下来，逻辑更新 c2nBalance 映射。此映射构成用户的未实现收益;
     * 因此，如果用户已经持有未实现的收益余额，则新余额包括先前余额和当前余额（同样，在 calculateYieldTotal 部分中对此进行了更多介绍）。
     * 最后，我们加入了一个条件语句，用于检查用户是否仍然持有质押资金。如果用户不这样做，则 isStaking 映射指向 false。
     * @param amount 用户想要取回的 DAI 数量
     */
    function unstake(uint256 amount) public {
        require(
            isStaking[msg.sender] = true &&
            stakingBalance[msg.sender] >= amount, 
            "Nothing to unstake"
        );
        uint256 yieldTransfer = calculateYieldTotal(msg.sender);
        startTime[msg.sender] = block.timestamp; // bug fix
        uint256 balanceTransfer = amount;
        amount = 0;
        stakingBalance[msg.sender] -= balanceTransfer;
        daiToken.transfer(msg.sender, balanceTransfer);
        c2nBalance[msg.sender] += yieldTransfer;
        if(stakingBalance[msg.sender] == 0){
            isStaking[msg.sender] = false;
        }
        emit Unstake(msg.sender, amount);
    }

    /**
     * withdrawYield（） 函数要求 calculateYieldTotal 函数或 c2nBalance 为用户保存余额。
     * if 条件语句专门检查 c2nBalance
     * 如果此映射指向余额，则意味着用户多次质押 DAI。合约逻辑将旧的 c2nBalance 添加到我们从 calculateYieldTotal 收到的运行收益总额中。
     * 请注意，逻辑遵循检查-效果-事务模式;其中，oldBalance 获取 c2nBalance uint。
     * 紧接着，c2nBalance 被分配为零（同样，以防止重入）。
     * 之后，startTime 被分配给当前时间戳，以重置应计收益。
     * 最后，合约调用了 c2nToken.mint 函数，该函数将 C2NToken 直接传输给用户。
     * 函数发出 YieldWithdraw 事件，让我们的前端能够轻松监听所述事件。
     */
    function withdrawYield() public {
        uint256 toTransfer = calculateYieldTotal(msg.sender);

        require(
            toTransfer > 0 ||
            c2nBalance[msg.sender] > 0,
            "Nothing to withdraw"
            );
            
        if(c2nBalance[msg.sender] != 0){
            uint256 oldBalance = c2nBalance[msg.sender];
            c2nBalance[msg.sender] = 0;
            toTransfer += oldBalance;
        }

        startTime[msg.sender] = block.timestamp;
        c2nToken.mint(msg.sender, toTransfer);
        emit YieldWithdraw(msg.sender, toTransfer);
    }

    /**
     * public for test
     * @param user 用户地址
     */
    function calculateYieldTime(address user) public view returns(uint256){
        uint256 end = block.timestamp;
        uint256 totalTime = end - startTime[user];
        return totalTime;
    }

    /**
     * 函数允许自动质押过程发生。
     * 首先，逻辑从 calculateYieldTime 函数中获取返回值并将其乘以 10¹⁸。
     * 这被证明是必要的，因为 Solidity 不处理浮点数或小数。
     * 通过将返回的时间戳差异转换为 BigNumber，Solidity 可以提供更高的精度。
     * 速率变量等于 86,400，等于一天中的秒数。
     * 这个想法是：用户每 24 小时收到 100% 的质押 DAI。
     * 前端：BigNumber 时间变量除以硬编码速率 （86400）。该函数将商乘以用户的 DAI 质押余额，然后除以 10¹⁸。
     * 当前端获取原始产量时，必须再次除以 10¹⁸ 以显示实际产量。
     * 在更传统的产量农场中，费率由用户在池中的百分比而不是时间决定。
     * @param user 用户地址
     */
    function calculateYieldTotal(address user) public view returns(uint256) {
        uint256 time = calculateYieldTime(user) * 10**18;
        uint256 rate = 86400;
        uint256 timeRate = time / rate;
        uint256 rawYield = (stakingBalance[user] * timeRate) / 10**18;
        return rawYield;
    }
}