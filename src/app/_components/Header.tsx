"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Bell, Server, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
	const pathname = usePathname();

	const navigation = [
		// { name: "ダッシュボード", href: "/dashboard" },
		{ name: "サーバー管理", href: "/servers" },
		{ name: "プラグイン", href: "/plugins" },
	];

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-14 items-center justify-between">
				<div className="flex items-center">
					<Link href="/" className="mx-6 flex items-center space-x-2">
						<span className="font-bold">MCP Server Manager</span>
					</Link>
					<nav className="hidden items-center space-x-6 font-medium text-sm md:flex">
						{navigation.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"transition-colors hover:text-foreground/80",
									pathname === item.href
										? "text-foreground"
										: "text-foreground/60",
								)}
							>
								{item.name}
							</Link>
						))}
					</nav>
				</div>

				<div className="flex items-center space-x-2">
					{/* サーバー状態表示 */}
					<Button variant="ghost" size="icon" className="relative">
						<Server className="h-5 w-5" />
						<span className="-top-1 -right-1 absolute h-3 w-3 rounded-full border border-background bg-green-500" />
					</Button>

					{/* 通知 */}
					<Button variant="ghost" size="icon" className="relative">
						<Bell className="h-5 w-5" />
						<span className="-top-1 -right-1 absolute h-3 w-3 rounded-full border border-background bg-red-500" />
					</Button>

					{/* ユーザーメニュー */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<User className="h-5 w-5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>アカウント</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<Settings className="mr-2 h-4 w-4" />
								<span>設定</span>
							</DropdownMenuItem>
							<DropdownMenuItem>
								<span>プロフィール</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem>
								<button
									type="button"
									onClick={() => {
										void signOut();
									}}
								>
									ログアウト
								</button>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Mobile navigation */}
			<div className="border-t md:hidden">
				<nav className="flex items-center justify-between px-2">
					{navigation.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex flex-1 justify-center py-2 font-medium text-xs transition-colors hover:text-foreground/80",
								pathname === item.href
									? "text-foreground"
									: "text-foreground/60",
							)}
						>
							{item.name}
						</Link>
					))}
				</nav>
			</div>
		</header>
	);
}
