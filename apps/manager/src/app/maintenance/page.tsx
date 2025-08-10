"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MaintenancePage = () => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isMaintenanceEnded, setIsMaintenanceEnded] = useState(false);

  useEffect(() => {
    const endTime = process.env.NEXT_PUBLIC_MAINTENANCE_END_TIME;
    if (!endTime) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const distance = end - now;

      if (distance < 0) {
        setIsMaintenanceEnded(true);
        setTimeLeft("メンテナンスは終了しました");
        // 5秒後にホームページへリダイレクト
        setTimeout(() => {
          router.push("/");
        }, 5000);
        return;
      }

      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [router]);

  // 5分ごとにページをリロード（メンテナンス終了チェック）
  useEffect(() => {
    const reloadInterval = setInterval(
      () => {
        if (!isMaintenanceEnded) {
          window.location.reload();
        }
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(reloadInterval);
  }, [isMaintenanceEnded]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Tumikiロゴ */}
        <div className="flex justify-center">
          <svg
            className="h-20 w-20"
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="56"
              y="56"
              width="400"
              height="400"
              rx="40"
              fill="url(#gradient)"
            />
            <rect x="156" y="156" width="80" height="80" fill="white" />
            <rect x="156" y="276" width="80" height="80" fill="white" />
            <rect x="276" y="156" width="80" height="80" fill="white" />
            <rect x="276" y="276" width="80" height="80" fill="white" />
            <defs>
              <linearGradient
                id="gradient"
                x1="56"
                y1="56"
                x2="456"
                y2="456"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#3B82F6" />
                <stop offset="1" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* メンテナンスアイコン */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <svg
                className="h-16 w-16 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div className="absolute -right-2 -bottom-2 flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-orange-500">
              <svg
                className="h-5 w-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* メインメッセージ */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            システムメンテナンス中
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            ただいまシステムメンテナンスを実施しています
          </p>
        </div>

        {/* カウントダウン */}
        {timeLeft && (
          <div className="space-y-2 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              メンテナンス終了予定時刻まで
            </p>
            <p className="font-mono text-4xl font-bold text-blue-600 dark:text-blue-400">
              {timeLeft}
            </p>
            {process.env.NEXT_PUBLIC_MAINTENANCE_END_TIME && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                終了予定:{" "}
                {new Date(
                  process.env.NEXT_PUBLIC_MAINTENANCE_END_TIME,
                ).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </p>
            )}
          </div>
        )}

        {/* 詳細メッセージ */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            お客様により良いサービスをご提供するため、システムのアップデートを行っています。
            メンテナンス中はサービスをご利用いただけません。
          </p>
        </div>

        {/* お問い合わせ */}
        <div className="pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            お急ぎの場合は、以下までお問い合わせください
          </p>
          <a
            href="mailto:support@tumiki.cloud"
            className="mt-2 inline-flex items-center text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            support@tumiki.cloud
          </a>
        </div>

        {/* 自動リロード通知 */}
        <p className="text-xs text-gray-400 italic dark:text-gray-500">
          このページは5分ごとに自動更新されます
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;
