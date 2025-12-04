"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";

type GoogleSignInButtonProps = {
  callbackUrl?: string;
  label?: string;
};

export const GoogleSignInButton = ({
  callbackUrl = "/mcp/servers",
  label = "Googleでログイン",
}: GoogleSignInButtonProps) => {
  const handleSignIn = async () => {
    await signIn("keycloak", { callbackUrl });
  };

  return (
    <button
      onClick={handleSignIn}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:outline-none"
      type="button"
    >
      <Image
        src="/logos/google.svg"
        alt="Google"
        width={20}
        height={20}
        className="h-5 w-5"
      />
      {label}
    </button>
  );
};
