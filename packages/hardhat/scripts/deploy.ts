import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";
import { parseEther } from "viem";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
	// Init viem
	const { viem, networkName } = await network.connect();
	console.log("Network name:", networkName);

	// Get deployer account
	const [deployer] = await viem.getWalletClients();
	console.log("Deployer address:", deployer.account.address);

	// Deploy the Balloon contract
	console.log("Deploying Balloon contract...");
	const balloon = await viem.deployContract("Balloon");
	console.log("Balloon contract deployed to:", balloon.address);

	// Store the ABIs in the web/src/abis directory
	const abiDir = path.join(__dirname, "../../web/src/abis");
	fs.mkdirSync(abiDir, { recursive: true });

	// Generate TypeScript file with as const for type inference
	fs.writeFileSync(
		path.join(abiDir, "balloon.ts"),
		`export const balloonAbi = ${JSON.stringify(balloon.abi, null, 2)} as const;`,
	);

	// Deploy the DEX contract
	console.log("Deploying DEX contract...");
	const dex = await viem.deployContract("DEX", [balloon.address]);
	console.log("DEX contract deployed to:", dex.address);

	// Generate TypeScript file with as const for type inference
	fs.writeFileSync(
		path.join(abiDir, "dex.ts"),
		`export const dexAbi = ${JSON.stringify(dex.abi, null, 2)} as const;`,
	);

	// Transfer 10 BAL to the deployer's address
	console.log("Transferring 10 BAL to the deployer's address...");
	await balloon.write.transfer([deployer.account.address, parseEther("10")]);
	console.log("10 BAL transferred to the deployer's address");

	// Approve the DEX contract to spend the BAL tokens 5 BAL for initializing the DEX contract
	console.log(
		"Approving the DEX contract to spend the BAL tokens 5 BAL for initializing the DEX contract...",
	);
	await balloon.write.approve([dex.address, parseEther("5")]);
	console.log(
		"DEX contract approved to spend the BAL tokens 5 BAL for initializing the DEX contract",
	);

	// Init the DEX contract with 5 BAL and 5 ETH
	console.log("Init the DEX contract with 5 BAL and 5 ETH...");
	await dex.write.init([parseEther("5")], { value: parseEther("5") });
	console.log("DEX contract initialized with 5 BAL and 5 ETH");

	console.log("Contracts deployed and initialized successfully");
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
