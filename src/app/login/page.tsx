import { auth } from "@/server/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "ログイン",
  description: "ログインページです",
};

export default async function Login() {
  const session = await auth();
  if (session?.user) {
    redirect("/mcp-manager/servers");
  }

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoginForm />
    </div>
  );
}
