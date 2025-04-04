import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "ログイン",
	description: "ログインページです",
};

export default async function Login() {
	const session = await auth();
	if (session?.user) {
		redirect("/servers");
	}

	return (
		<div className="flex h-screen w-full items-center justify-center">
			<LoginForm />
		</div>
	);
}
