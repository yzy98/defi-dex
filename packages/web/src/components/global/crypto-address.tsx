"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
	address: `0x${string}`;
	truncateLength?: number; // How many chars to show on each side
};

export const CryptoAddress = ({ address, truncateLength = 3 }: Props) => {
	const [copied, setCopied] = useState(false);

	const truncateAddress = (addr: string, length: number) => {
		if (addr.length <= length * 2 + 2) return addr;
		return `${addr.slice(0, length + 2)}...${addr.slice(-length)}`;
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(address);
			setCopied(true);
			toast.success("Address copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			toast.error("Failed to copy address");
		}
	};

	return (
		<div className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1 w-fit">
			<span className="text-xs font-mono">
				{truncateAddress(address, truncateLength)}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-5 w-5"
				onClick={handleCopy}
				title="Copy address"
			>
				{copied ? (
					<Check className="h-3 w-3 text-green-500" />
				) : (
					<Copy className="h-3 w-3" />
				)}
			</Button>
		</div>
	);
};
