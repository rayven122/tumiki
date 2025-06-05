import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Header } from "@/app/_components/Header";
import "@/styles/globals.css";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <Header />
      {children}
    </>
  );
}
