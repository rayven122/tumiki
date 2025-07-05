"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto py-8">
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          エラーが発生しました
        </h2>
        <p className="mb-6 max-w-md text-gray-600">
          MCPサーバーの読み込み中に問題が発生しました。再度お試しください。
        </p>
        <div className="flex gap-4">
          <Button onClick={reset} variant="default">
            再試行
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
          >
            ホームに戻る
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-8 max-w-2xl">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              開発者向けエラー詳細
            </summary>
            <pre className="mt-2 rounded bg-gray-100 p-4 text-left text-xs whitespace-pre-wrap text-gray-800">
              {error.message}
              {error.digest && `\nError ID: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
