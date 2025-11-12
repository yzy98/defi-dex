"use client";

import { ArrowDownIcon, SendHorizonalIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatEther, parseEther } from "viem";
import {
	useBalance,
	useConfig,
	useReadContract,
	useWriteContract,
} from "wagmi";
import { readContract } from "wagmi/actions";
import { balloonAbi } from "@/abis/balloon";
import { dexAbi } from "@/abis/dex";
import { CryptoAddress } from "@/components/global/crypto-address";
import { Curve } from "@/components/global/curve";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const BALLON_CONTRACT_ADDRESS = process.env
	.NEXT_PUBLIC_CONTRACT_BALLOON_ADDRESS as `0x${string}`;
const DEX_CONTRACT_ADDRESS = process.env
	.NEXT_PUBLIC_CONTRACT_DEX_ADDRESS as `0x${string}`;

export const DexInfoCard = () => {
	const [sellToken, setSellToken] = useState<"BAL" | "ETH">("ETH");
	const [sellAmount, setSellAmount] = useState("");
	const [buyAmount, setBuyAmount] = useState("");
	const [depositAmount, setDepositAmount] = useState("");
	const [withdrawAmount, setWithdrawAmount] = useState("");
	const [isCalculating, setIsCalculating] = useState(false);

	const config = useConfig();
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	const { data: dexETHBalance } = useBalance({
		address: DEX_CONTRACT_ADDRESS,
	});

	const { data: dexBalloonBalance } = useReadContract({
		abi: balloonAbi,
		address: BALLON_CONTRACT_ADDRESS,
		functionName: "balanceOf",
		args: [DEX_CONTRACT_ADDRESS],
	});

	const { data: totalLiquidity } = useReadContract({
		abi: dexAbi,
		address: DEX_CONTRACT_ADDRESS,
		functionName: "totalLiquidity",
	});

	const ethToToken = useCallback(
		async (ethAmount: string) => {
			if (!dexETHBalance?.value || !dexBalloonBalance || !ethAmount) {
				return "";
			}

			try {
				const tokenOutput = await readContract(config, {
					abi: dexAbi,
					address: DEX_CONTRACT_ADDRESS,
					functionName: "price",
					args: [parseEther(ethAmount), dexETHBalance.value, dexBalloonBalance],
				});

				return formatEther(tokenOutput);
			} catch (error) {
				console.error("Error calculating token output:", error);
				return "";
			}
		},
		[config, dexETHBalance?.value, dexBalloonBalance],
	);

	const tokenToEth = useCallback(
		async (tokenAmount: string) => {
			if (!dexETHBalance?.value || !dexBalloonBalance || !tokenAmount) {
				return "";
			}

			try {
				const ethOutput = await readContract(config, {
					abi: dexAbi,
					address: DEX_CONTRACT_ADDRESS,
					functionName: "price",
					args: [
						parseEther(tokenAmount),
						dexBalloonBalance,
						dexETHBalance.value,
					],
				});

				return formatEther(ethOutput);
			} catch (error) {
				console.error("Error calculating ETH output:", error);
				return "";
			}
		},
		[config, dexETHBalance?.value, dexBalloonBalance],
	);

	const getRequiredEthFromToken = useCallback(
		async (tokenAmount: string) => {
			if (!dexETHBalance?.value || !dexBalloonBalance || !tokenAmount) {
				return "";
			}

			try {
				const requiredEth = await readContract(config, {
					abi: dexAbi,
					address: DEX_CONTRACT_ADDRESS,
					functionName: "calculateXInput",
					args: [
						parseEther(tokenAmount),
						dexETHBalance.value,
						dexBalloonBalance,
					],
				});

				return formatEther(requiredEth);
			} catch (error) {
				console.error("Error calculating required ETH:", error);
				return "";
			}
		},
		[config, dexETHBalance?.value, dexBalloonBalance],
	);

	const getRequiredTokenFromEth = useCallback(
		async (ethAmount: string) => {
			if (!dexETHBalance?.value || !dexBalloonBalance || !ethAmount) {
				return "";
			}

			try {
				const requiredToken = await readContract(config, {
					abi: dexAbi,
					address: DEX_CONTRACT_ADDRESS,
					functionName: "calculateXInput",
					args: [parseEther(ethAmount), dexBalloonBalance, dexETHBalance.value],
				});

				return formatEther(requiredToken);
			} catch (error) {
				console.error("Error calculating required Token:", error);
				return "";
			}
		},
		[config, dexETHBalance?.value, dexBalloonBalance],
	);

	const handleChangeInput = useCallback(
		(isSell: boolean, newAmount: string) => {
			// Clear previous timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			if (newAmount === "") {
				setSellAmount("");
				setBuyAmount("");
				setIsCalculating(false);
				return;
			}

			if (isSell) {
				// Update sell amount immediately for responsive UI
				setSellAmount(newAmount);
				setIsCalculating(true);

				// Debounce the async calculation
				debounceTimerRef.current = setTimeout(async () => {
					try {
						const newBuyAmount =
							sellToken === "ETH"
								? await ethToToken(newAmount)
								: await tokenToEth(newAmount);
						setBuyAmount(newBuyAmount);
					} catch (error) {
						console.error("Error calculating buy amount:", error);
						setBuyAmount("0");
					} finally {
						setIsCalculating(false);
					}
				}, 300); // Wait 300ms after user stops typing
			} else {
				// Update buy amount immediately
				setBuyAmount(newAmount);
				setIsCalculating(true);

				debounceTimerRef.current = setTimeout(async () => {
					try {
						const newSellAmount =
							sellToken === "ETH"
								? await getRequiredEthFromToken(newAmount)
								: await getRequiredTokenFromEth(newAmount);
						setSellAmount(newSellAmount);
					} catch (error) {
						console.error("Error calculating sell amount:", error);
						setSellAmount("0");
					} finally {
						setIsCalculating(false);
					}
				}, 300);
			}
		},
		[
			sellToken,
			ethToToken,
			tokenToEth,
			getRequiredEthFromToken,
			getRequiredTokenFromEth,
		],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	const handleChangeSellToken = () => {
		setSellToken(sellToken === "BAL" ? "ETH" : "BAL");
		setSellAmount("");
		setBuyAmount("");
	};

	const handleResetInputs = () => {
		setSellToken("ETH");
		setSellAmount("");
		setBuyAmount("");
	};

	const { writeContractAsync, isPending: isWritingContract } =
		useWriteContract();

	const handleSwap = async () => {
		if (sellToken === "BAL") {
			try {
				// Approve the DEX contract to spend the BAL tokens
				await writeContractAsync({
					abi: balloonAbi,
					address: BALLON_CONTRACT_ADDRESS,
					functionName: "approve",
					args: [DEX_CONTRACT_ADDRESS, parseEther(sellAmount)],
				});

				// Swap BAL to ETH
				await writeContractAsync({
					abi: dexAbi,
					address: DEX_CONTRACT_ADDRESS,
					functionName: "tokenToEth",
					args: [parseEther(sellAmount)],
				});

				toast.success("Swap successful");
			} catch (error) {
				toast.error("Swap failed", {
					description: error instanceof Error ? error.message : "Unknown error",
				});
			} finally {
				setSellAmount("");
				setBuyAmount("");
			}
		} else {
			try {
				// Swap ETH to BAL
				await writeContractAsync({
					abi: dexAbi,
					address: DEX_CONTRACT_ADDRESS,
					functionName: "ethToToken",
					value: parseEther(sellAmount),
				});
				toast.success("Swap successful");
			} catch (error) {
				toast.error("Swap failed", {
					description: error instanceof Error ? error.message : "Unknown error",
				});
			} finally {
				setSellAmount("");
				setBuyAmount("");
			}
		}
	};

	const handleDepositLiquidity = async () => {
		if (!dexBalloonBalance || !dexETHBalance) {
			return;
		}

		const tokenDeposited =
			(parseEther(depositAmount) * dexBalloonBalance) / dexETHBalance.value +
			BigInt(1);

		try {
			// Approve the DEX contract to spend the BAL tokens
			await writeContractAsync({
				abi: balloonAbi,
				address: BALLON_CONTRACT_ADDRESS,
				functionName: "approve",
				args: [DEX_CONTRACT_ADDRESS, tokenDeposited],
			});

			// Deposit liquidity
			await writeContractAsync({
				abi: dexAbi,
				address: DEX_CONTRACT_ADDRESS,
				functionName: "deposit",
				value: parseEther(depositAmount),
			});
			toast.success("Deposit successful");
		} catch (error) {
			toast.error("Deposit failed", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setDepositAmount("");
		}
	};

	const handleWithdrawLiquidity = async () => {
		try {
			await writeContractAsync({
				abi: dexAbi,
				address: DEX_CONTRACT_ADDRESS,
				functionName: "withdraw",
				args: [parseEther(withdrawAmount)],
			});
			toast.success("Withdraw successful");
		} catch (error) {
			toast.error("Withdraw failed", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setWithdrawAmount("");
		}
	};

	return (
		<Card className="w-sm md:w-xl">
			<CardHeader>
				<CardTitle>DEX Contract</CardTitle>
				<CardDescription>
					<CryptoAddress address={DEX_CONTRACT_ADDRESS} />
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Separator />
				<div className="flex flex-col gap-2 items-center">
					<div className="flex items-center gap-8">
						<div className="flex items-center gap-2">
							<span>💰💰💰</span>
							{dexETHBalance?.value ? (
								<span>
									{Number(formatEther(dexETHBalance.value)).toFixed(4)}
								</span>
							) : (
								<Skeleton className="w-16 h-4" />
							)}
						</div>
						<div className="flex items-center gap-2">
							<span>🎈🎈🎈</span>
							{dexBalloonBalance ? (
								<span>{Number(formatEther(dexBalloonBalance)).toFixed(4)}</span>
							) : (
								<Skeleton className="w-16 h-4" />
							)}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Input
							type="text"
							className="w-[340px]"
							value={sellAmount}
							onChange={(e) => handleChangeInput(true, e.target.value)}
							placeholder={
								isCalculating ? "Calculating..." : `Sell ${sellToken}`
							}
							disabled={isWritingContract}
						/>
						<span className="text-sm font-bold">{sellToken}</span>
					</div>
					<Button
						type="button"
						size="icon"
						className="rounded-full"
						onClick={handleChangeSellToken}
						disabled={isWritingContract}
					>
						<ArrowDownIcon className="size-3" />
					</Button>
					<div className="flex items-center gap-2">
						<Input
							type="text"
							className="w-[340px]"
							value={buyAmount}
							onChange={(e) => handleChangeInput(false, e.target.value)}
							placeholder={
								isCalculating
									? "Calculating..."
									: `Buy ${sellToken === "ETH" ? "BAL" : "ETH"}`
							}
							disabled={isWritingContract}
						/>
						<span className="text-sm font-bold">
							{sellToken === "ETH" ? "BAL" : "ETH"}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={handleResetInputs}
							disabled={isWritingContract}
						>
							Reset
						</Button>
						<Button
							type="button"
							onClick={handleSwap}
							disabled={isWritingContract}
						>
							Swap
						</Button>
					</div>
				</div>
				<Separator />
				<div className="flex flex-col gap-2 items-center">
					<div className="flex items-center gap-2">
						<span>💦💦💦</span>
						{totalLiquidity ? (
							<span>{Number(formatEther(totalLiquidity)).toFixed(4)}</span>
						) : (
							<Skeleton className="w-16 h-4" />
						)}
					</div>
					<div className="flex items-center gap-2">
						<Input
							type="text"
							className="w-[340px]"
							value={depositAmount}
							onChange={(e) => setDepositAmount(e.target.value)}
							placeholder="Deposit liquidity by entering ETH amount"
							disabled={isWritingContract}
						/>
						<Button
							type="button"
							size="icon"
							onClick={handleDepositLiquidity}
							disabled={isWritingContract}
						>
							<SendHorizonalIcon className="size-3" />
						</Button>
					</div>
					<div className="flex items-center gap-2">
						<Input
							type="text"
							className="w-[340px]"
							value={withdrawAmount}
							onChange={(e) => setWithdrawAmount(e.target.value)}
							placeholder="Withdraw liquidity by entering LPT amount"
							disabled={isWritingContract}
						/>
						<Button
							type="button"
							size="icon"
							onClick={handleWithdrawLiquidity}
							disabled={isWritingContract}
						>
							<SendHorizonalIcon className="size-3" />
						</Button>
					</div>
				</div>
				<Curve
					addingEth={
						sellToken === "ETH" && sellAmount !== ""
							? parseFloat(sellAmount)
							: 0
					}
					addingToken={
						sellToken === "BAL" && sellAmount !== ""
							? parseFloat(sellAmount)
							: 0
					}
					ethReserve={parseFloat(
						formatEther(dexETHBalance?.value ?? BigInt(0)),
					)}
					tokenReserve={parseFloat(formatEther(dexBalloonBalance ?? BigInt(0)))}
					width={500}
					height={500}
				/>
			</CardContent>
		</Card>
	);
};
