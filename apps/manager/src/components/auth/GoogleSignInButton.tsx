"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  callbackUrl?: string;
  label?: string;
};

export const GoogleSignInButton = ({
  callbackUrl = "/dashboard",
  label = "Googleでログイン",
}: GoogleSignInButtonProps) => {
  const handleSignIn = async () => {
    await signIn("keycloak", { callbackUrl });
  };

  return (
    <Button
      onClick={handleSignIn}
      variant="outline"
      className="w-full"
      size="lg"
    >
      <Image
        src="/logos/google.svg"
        alt="Google"
        width={20}
        height={20}
        className="mr-2"
      />
      {label}
    </Button>
  );
};
