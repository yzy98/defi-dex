// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DEX {
  /* ========== GLOBAL VARIABLES ========== */
  uint256 private constant FEE_PERCENT = 997;
  uint256 private constant FEE_DECIMAL = 1000;

  IERC20 token;
  uint256 public totalLiquidity;
  mapping (address => uint256) public liquidity;

  /* ========== EVENTS ========== */

  /**
   * @notice Emitted when ethToToken() swap transacted
   */
  event EthToTokenSwap(address swapper, uint256 tokenOutput, uint256 ethInput);

  /**
   * @notice Emitted when tokenToEth() swap transacted
   */
  event TokenToEthSwap(address swapper, uint256 tokensInput, uint256 ethOutput);

  /**
   * @notice Emitted when liquidity provided to DEX and mints LPTs.
   */
  event LiquidityProvided(
    address liquidityProvider,
    uint256 liquidityMinted,
    uint256 ethInput,
    uint256 tokensInput
  );

  /**
   * @notice Emitted when liquidity removed from DEX and decreases LPT count within DEX.
   */
  event LiquidityRemoved(
    address liquidityRemover,
    uint256 liquidityWithdrawn,
    uint256 tokensOutput,
    uint256 ethOutput
  );

  /* ========== CONSTRUCTOR ========== */

  constructor(address tokenAddress) {
    token = IERC20(tokenAddress); //specifies the token address that will hook into the interface and be used through the variable 'token'
  }

  /**
   * @notice Initializes the DEX with the given amount of tokens (BAL) and ETH, so that fill the liquidity pool
   * @param tokenAmount The amount of tokens (BAL) to add to the liquidity pool
   * @return totalLiquidity the number of LPTs minting as a result of deposits made to DEX contract
   * NOTE: Init ratio is 1:1, so the amount of tokens added to the liquidity pool must be equal to the amount of ETH added
   */
  function init(uint256 tokenAmount) public payable returns (uint256) {
    require(totalLiquidity == 0, "DEX: init - already has liquidity");

    totalLiquidity = address(this).balance;
    liquidity[msg.sender] = totalLiquidity;

    require(token.transferFrom(msg.sender, address(this), tokenAmount), "DEX: init - token transfer failed");
    return totalLiquidity;
  }

  /**
   * @notice returns yOutput, or yDelta for xInput (or xDelta)
   * @param xInput The amount of x tokens input
   * @param xReserves The amount of x tokens in the reserves
   * @param yReserves The amount of y tokens in the reserves
   * @return yOutput The amount of y tokens output
   */
  function price(
    uint256 xInput,
    uint256 xReserves,
    uint256 yReserves
  ) public pure returns (uint256 yOutput) {
    uint256 xInputWithFee = xInput * FEE_PERCENT;
    uint256 numerator = yReserves * xInputWithFee;
    uint256 denominator = (xReserves * FEE_DECIMAL) + xInputWithFee;
    return numerator / denominator;
  }

  /**
   * @notice Returns the current price of the token in ETH
   * @return _currentPrice The current price of the token in ETH : xx BAL / ETH
   */
  function currentPrice() public view returns (uint256 _currentPrice) {
    _currentPrice = price(1 ether, address(this).balance, token.balanceOf(address(this)));
    return _currentPrice;
  }

  /**
   * @notice Swaps ETH for tokens
   * @return tokenOutput The amount of tokens output
   */
  function ethToToken() public payable returns (uint256 tokenOutput) {
    // Check if the paid ETH is greater than 0
    require(msg.value > 0, "cannot swap o ETH");

    // Calculate yOutput (tokenOutput)
    uint256 ethReserves = address(this).balance - msg.value;
    uint256 tokenReserves = token.balanceOf(address(this));
    tokenOutput =  price(msg.value, ethReserves, tokenReserves);

    // Transfer the tokens to the caller
    require(token.transfer(msg.sender, tokenOutput), "ethToToken(): reverted swap.");

    emit EthToTokenSwap(msg.sender, tokenOutput, msg.value);
    return tokenOutput;
  }

  /**
   * Swaps tokens for ETH
   * @param tokenInput The amount of tokens input
   * @return ethOutput The amount of ETH output
   */
  function tokenToEth(uint256 tokenInput) public returns (uint256 ethOutput) {
    // Checks
    require(tokenInput > 0, "cannot swap 0 tokens");
    require(token.balanceOf(msg.sender) >= tokenInput, "insufficient tokens for user");
    require(token.allowance(msg.sender, address(this)) >= tokenInput, "insufficient token allowance");

    // Calculate yOutput (ethOutput)
    uint256 tokenReserves = token.balanceOf(address(this));
    uint256 ethReserves = address(this).balance;
    ethOutput = price(tokenInput, tokenReserves, ethReserves);

    // Transfer tokens
    require(token.transferFrom(msg.sender, address(this), tokenInput), "tokenToEth(): reverted swap.");
    
    // Transfer ETH
    (bool success, ) = payable(msg.sender).call{ value: ethOutput }("");
    require(success, "tokenToEth: revert in transferring eth to you!");

    emit TokenToEthSwap(msg.sender, tokenInput, ethOutput);
    return ethOutput;
  }

  /**
   * @notice Deposits ETH and BAL into the DEX and mints LPTs
   * @return tokensDeposited The amount of tokens deposited
   */
  function deposit() public payable returns (uint256 tokensDeposited) {
    // Make sure not sending 0 ETH
    require(msg.value > 0, "cannot deposit 0 ETH");

    // Calculate liquidity ratio ETH / BAL
    uint256 ethReserves = address(this).balance - msg.value;
    uint256 tokenReserves = token.balanceOf(address(this));

    // tokenDeposited / ethDeposited = tokenReserves / ethReserves
    tokensDeposited = (msg.value * tokenReserves / ethReserves) + 1;

    // Check user has enough token balance and allowance
    require(token.balanceOf(msg.sender) >= tokensDeposited, "insufficient token balance");
    require(token.allowance(msg.sender, address(this)) >= tokensDeposited, "insufficient token allowance");

    // Calculate LPTs minted
    // LPT minted / ethDeposited = totalLiquidity / ethReserves
    uint256 liquidityMinted = (msg.value * totalLiquidity) / ethReserves;
    liquidity[msg.sender] += liquidityMinted;
    totalLiquidity += liquidityMinted;

    require(token.transferFrom(msg.sender, address(this), tokensDeposited));
    emit LiquidityProvided(msg.sender, liquidityMinted, msg.value, tokensDeposited);
    return tokensDeposited;
  }

  function withdraw(uint256 lptAmount) public returns (uint256 ethAmount, uint256 tokenAmount) {
    require(liquidity[msg.sender] >= lptAmount, "withdraw: sender does not have enough liquidity to withdraw.");

    // Calculate ethAmount to withdraw
    // ethAmount / ethReserves = lptAmount / totalLiquidity
    uint256 ethReserves = address(this).balance;
    ethAmount = (lptAmount * ethReserves) / totalLiquidity;

    // Calculate tokenAmount to withdraw
    // tokenAmount / tokenReserves = lptAmount / totalLiquidity
    uint256 tokenReserves = token.balanceOf(address(this));
    tokenAmount = (lptAmount * tokenReserves) / totalLiquidity;

    // Reduce liquidity pool
    liquidity[msg.sender] -= lptAmount;
    totalLiquidity -= lptAmount;

    // Transfer ETH
    (bool success, ) = payable(msg.sender).call{ value: ethAmount }("");
    require(success, "withdraw(): revert in transferring eth to you!");

    // Transfer tokens (BAL)
    require(token.transfer(msg.sender, tokenAmount), "withdraw(): revert in transferring tokens to you!");

    emit LiquidityRemoved(msg.sender, lptAmount, tokenAmount, ethAmount);
    return (ethAmount, tokenAmount);
  }
}