"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
	darkTheme,
	getDefaultConfig,
	getDefaultWallets,
	lightTheme,
	RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import {
	argentWallet,
	ledgerWallet,
	trustWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";

const { wallets } = getDefaultWallets();

export const config = getDefaultConfig({
	appName: "defi-dex",
	projectId: process.env.NEXT_PUBLIC_PROJECT_ID!,
	wallets: [
		...wallets,
		{
			groupName: "Other",
			wallets: [argentWallet, trustWallet, ledgerWallet],
		},
	],
	chains: [hardhat, sepolia],
	ssr: true,
});

export const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
	const { resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDarkMode = resolvedTheme === "dark";

	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider
					theme={
						mounted ? (isDarkMode ? darkTheme() : lightTheme()) : undefined
					}
				>
					{children}
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}
