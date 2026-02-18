"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

type InviteAlreadyMemberProps = {
  organizationSlug: string;
  organizationName: string;
};

export const InviteAlreadyMember = ({
  organizationSlug,
  organizationName,
}: InviteAlreadyMemberProps) => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push(`/${organizationSlug}/mcps`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [organizationSlug, router]);

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <h1 className="mb-2 text-2xl font-bold text-green-900">
            既にメンバーです
          </h1>
          <p className="mb-6 text-sm text-green-700">
            あなたは既に{organizationName}のメンバーです。
          </p>
          <p className="text-sm text-green-600">
            {countdown}秒後に組織ページへ移動します...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
