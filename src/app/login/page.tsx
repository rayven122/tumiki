import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
	title: "ログイン",
	description: "ログインページです",
};

export default function Login() {
	return (
		<div className="flex h-screen w-full items-center justify-center">
			<LoginForm />
		</div>
	);
}
