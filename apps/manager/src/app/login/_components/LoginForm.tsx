"use client";

import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      router.push("/dashboard");
    } catch {
      setError("予期せぬエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">ログイン</CardTitle>
        <CardDescription>
          メールアドレスまたはソーシャルプロバイダーでログインしてください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
              <a className="text-primary text-sm hover:underline">
                パスワードをお忘れですか？
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <Label
              htmlFor="remember"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              ログイン状態を保持する
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ログイン中...
              </>
            ) : (
              "メールアドレスでログイン"
            )}
          </Button>
        </form>

        <div className="flex items-center">
          <Separator className="flex-1" />
          <span className="text-muted-foreground px-3 text-xs">または</span>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a href="/auth/login">Log in</a>
          <Button
            variant="outline"
            type="button"
            className="border-gray-300 bg-white text-black hover:bg-gray-50"
          >
            <Image
              src="/logos/google.svg"
              alt="Google"
              width={20}
              height={20}
              className="mr-2"
            />
            Google
          </Button>
          <Button
            variant="outline"
            type="button"
            className="border-gray-300 bg-white text-black hover:bg-gray-50"
          >
            <Image
              src="/logos/github.svg"
              alt="GitHub"
              width={20}
              height={20}
              className="mr-2"
            />
            GitHub
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground w-full text-center text-sm">
          アカウントをお持ちでないですか？{" "}
          <a className="text-primary hover:underline">新規登録</a>
        </p>
      </CardFooter>
    </Card>
  );
}
