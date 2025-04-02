import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "ログイン",
	description: "ログインページです",
};

export default async function Login() {
	try {
		const session = await auth();

		if (session?.user) {
			redirect("/servers");
		}

		return (
			<div className="flex h-screen w-full items-center justify-center">
				<LoginForm />
			</div>
		);
	} catch (error) {
		console.error("認証エラー:", error);
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-red-500">
						エラーが発生しました
					</h1>
					<p className="mt-2 text-gray-600">
						認証システムで問題が発生しました。もう一度お試しください。
					</p>
				</div>
			</div>
		);
	}
}
