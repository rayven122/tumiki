"use client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Cloud,
	Database,
	Droplet,
	Globe,
	Server,
	ServerCog,
} from "lucide-react";
import { useState } from "react";
import { ApiTokenModal } from "./ApiTokenModal";

type Service = {
	id: string;
	name: string;
	description: string;
	icon: string;
};

type ServiceCardProps = {
	service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
	const [tokenModalOpen, setTokenModalOpen] = useState(false);
	// アイコンを選択する関数
	const getIcon = () => {
		switch (service.icon) {
			case "database":
				return <Database className="h-6 w-6" />;
			case "globe":
				return <Globe className="h-6 w-6" />;
			case "cloud":
				return <Cloud className="h-6 w-6" />;
			case "server":
				return <Server className="h-6 w-6" />;
			case "server-cog":
				return <ServerCog className="h-6 w-6" />;
			case "droplet":
				return <Droplet className="h-6 w-6" />;
			default:
				return <Server className="h-6 w-6" />;
		}
	};

	return (
		<Card className="overflow-hidden">
			<CardHeader className="flex flex-row items-center space-y-0 pb-2">
				<div className="mr-2 rounded-md bg-muted p-2">{getIcon()}</div>
				<div>
					<CardTitle>{service.name}</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="pt-4">
				<CardDescription className="text-sm">
					{service.description}
				</CardDescription>
			</CardContent>
			<CardFooter>
				<Button
					type="button"
					onClick={() => {
						setTokenModalOpen(true);
					}}
					className="w-full"
				>
					接続
				</Button>
			</CardFooter>
			<ApiTokenModal
				open={tokenModalOpen}
				onOpenChange={setTokenModalOpen}
				serviceId={service.id}
				onSave={() => {}}
			/>
		</Card>
	);
}
