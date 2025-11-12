"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ModeToggle } from "./mode-toggle";

export function Header() {
	return (
		<header className="w-full flex justify-between items-center px-8 py-4 bg-background z-50 border-b">
			<h1 className="text-2xl font-bold">Defi DEX</h1>
			<div className="flex items-center gap-2">
				<ConnectButton />
				<ModeToggle />
			</div>
		</header>
	);
}
