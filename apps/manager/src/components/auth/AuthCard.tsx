import type { ReactNode } from "react";
import Image from "next/image";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export const AuthCard = ({ title, description, children }: AuthCardProps) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* グラデーション背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800" />

      {/* グラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-700/20 via-transparent to-transparent" />

      {/* 中央カード */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl backdrop-blur-sm">
        {/* ロゴ */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-2">
            <Image
              src="/favicon/logo.svg"
              alt="Tumiki"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              TUMIKI
            </span>
          </div>
        </div>

        {/* タイトルと説明 */}
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-sm text-slate-600">{description}</p>
        </div>

        {/* コンテンツ */}
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
};
