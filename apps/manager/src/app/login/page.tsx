import { auth0 } from "@tumiki/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./_components/LoginForm";
import { Header } from "@/app/_components/Header";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ログイン",
  description: "ログインページです",
};

export default async function Login() {
  const session = await auth0.getSession();
  if (session?.user) {
    redirect("/mcp/servers");
  }

  return (
    <>
      <Header />
      <div className="flex h-screen w-full items-center justify-center">
        <LoginForm />
      </div>
    </>
  );
}
