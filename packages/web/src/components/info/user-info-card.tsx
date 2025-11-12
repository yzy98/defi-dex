"use client";

import { formatEther } from "viem";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { balloonAbi } from "@/abis/balloon";
import { dexAbi } from "@/abis/dex";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CryptoAddress } from "../global/crypto-address";
import { Skeleton } from "../ui/skeleton";

const BALLON_CONTRACT_ADDRESS = process.env
	.NEXT_PUBLIC_CONTRACT_BALLOON_ADDRESS as `0x${string}`;
const DEX_CONTRACT_ADDRESS = process.env
	.NEXT_PUBLIC_CONTRACT_DEX_ADDRESS as `0x${string}`;

export const UserInfoCard = () => {
	const { address: userAddress } = useAccount();

	const { data: userETHBalance } = useBalance({
		address: userAddress as `0x${string}`,
	});

	const { data: userBalloonBalance } = useReadContract({
		abi: balloonAbi,
		address: BALLON_CONTRACT_ADDRESS,
		functionName: "balanceOf",
		args: [userAddress as `0x${string}`],
	});

	const { data: userLiquidity } = useReadContract({
		abi: dexAbi,
		address: DEX_CONTRACT_ADDRESS,
		functionName: "liquidity",
		args: [userAddress as `0x${string}`],
	});

	return (
		<Card className="w-sm">
			<CardHeader>
				<CardTitle>User Info</CardTitle>
				<CardDescription>
					{userAddress ? (
						<CryptoAddress address={userAddress as `0x${string}`} />
					) : (
						<Skeleton className="w-32 h-7" />
					)}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span>💰💰💰</span>
					{userETHBalance?.value ? (
						<span>{Number(formatEther(userETHBalance.value)).toFixed(4)}</span>
					) : (
						<Skeleton className="w-16 h-4" />
					)}
				</div>
				<div className="flex items-center justify-between">
					<span>🎈🎈🎈</span>
					{userBalloonBalance ? (
						<span>{Number(formatEther(userBalloonBalance)).toFixed(4)}</span>
					) : (
						<Skeleton className="w-16 h-4" />
					)}
				</div>
				<div className="flex items-center justify-between">
					<span>💦💦💦</span>
					{userLiquidity ? (
						<span>{Number(formatEther(userLiquidity)).toFixed(4)}</span>
					) : (
						<Skeleton className="w-16 h-4" />
					)}
				</div>
			</CardContent>
		</Card>
	);
};
