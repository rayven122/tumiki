"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

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
      className="group relative flex w-full items-center justify-between overflow-hidden border-2 border-black bg-white px-6 py-4 font-bold text-gray-800 shadow-(--shadow-hard) transition-all duration-200 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-(--shadow-hard-sm) active:translate-x-1 active:translate-y-1 active:shadow-none"
    >
      <div className="absolute inset-0 bg-linear-to-r from-indigo-50 to-purple-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"></div>
      <div className="relative flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center border-2 border-black bg-white">
          <Image
            src="/logos/google.svg"
            alt="Google Logo"
            width={20}
            height={20}
            className="h-5 w-5"
          />
        </div>
        <span className="text-lg">{label}</span>
      </div>
      <ArrowRight className="relative h-6 w-6 text-gray-400 transition-all group-hover:translate-x-1 group-hover:text-indigo-600" />
    </button>
  );
};
