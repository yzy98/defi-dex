import { DexInfoCard } from "@/components/info/dex-info-card";
import { UserInfoCard } from "@/components/info/user-info-card";

export default function Home() {
	return (
		<div className="w-full max-w-7xl mx-auto mt-10">
			<div className="flex flex-col md:flex-row gap-10">
				<DexInfoCard />
				<UserInfoCard />
			</div>
		</div>
	);
}
