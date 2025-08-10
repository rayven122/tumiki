"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Settings, Clock, Mail, ArrowRight } from "lucide-react";

const MaintenancePage = () => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isMaintenanceEnded, setIsMaintenanceEnded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Background Decorative Blocks */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-32 left-8 h-16 w-16 border-2 border-gray-300 bg-gray-100 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-40 right-12 h-20 w-20 border-2 border-gray-300 bg-gray-100 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
          animate={{
            y: [0, -12, 0],
            rotate: [0, -8, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          className="absolute bottom-32 left-16 h-14 w-14 border-2 border-gray-200 bg-gray-50 shadow-[3px_3px_0_rgba(0,0,0,0.05)]"
          animate={{
            y: [0, 8, 0],
            rotate: [0, -3, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute right-20 bottom-40 h-18 w-18 border-2 border-gray-300 bg-gray-100 shadow-[4px_4px_0_rgba(0,0,0,0.1)]"
          animate={{
            y: [0, -8, 0],
            rotate: [0, 6, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <motion.div
          className="w-full max-w-4xl text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Tumiki Logo */}
          <motion.div
            className="mb-12 flex justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-lg bg-gradient-to-r from-blue-400 to-purple-600 opacity-20 blur-xl" />
              <img
                src="/favicon/logo.svg"
                alt="Tumiki"
                className="relative h-24 w-24"
              />
            </div>
          </motion.div>

          {/* Main Title */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-4 py-2">
              <Settings className="mr-2 h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                メンテナンス中
              </span>
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
              システムアップデート
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                実施中
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              より良いサービスをお届けするため、システムの更新作業を行っています。
              <br />
              ご不便をおかけしますが、しばらくお待ちください。
            </p>
          </motion.div>

          {/* Countdown Timer */}
          {timeLeft && (
            <motion.div
              className="mx-auto mb-12 max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-[8px_8px_0_rgba(0,0,0,0.1)]">
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-600 to-purple-600" />
                <div className="mb-2 flex items-center justify-center text-gray-500">
                  <Clock className="mr-2 h-5 w-5" />
                  <span className="text-sm font-medium">
                    メンテナンス終了予定まで
                  </span>
                </div>
                <div className="mb-4 font-mono text-6xl font-bold text-gray-900">
                  {timeLeft}
                </div>
                {process.env.NEXT_PUBLIC_MAINTENANCE_END_TIME && (
                  <p className="text-sm text-gray-500">
                    終了予定時刻:{" "}
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
            </motion.div>
          )}

          {/* Info Cards */}
          <motion.div
            className="mx-auto mb-12 grid max-w-2xl gap-4 md:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-left">
              <h3 className="mb-2 font-semibold text-gray-900">実施内容</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• システムパフォーマンスの向上</li>
                <li>• セキュリティアップデート</li>
                <li>• 新機能の追加準備</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-left">
              <h3 className="mb-2 font-semibold text-gray-900">ご注意事項</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• サービスは一時的に利用不可</li>
                <li>• データは安全に保護されています</li>
                <li>• 作業完了後、自動的に復旧</li>
              </ul>
            </div>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            className="mx-auto max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="rounded-xl bg-blue-50 p-6">
              <p className="mb-3 text-sm text-gray-600">
                緊急のお問い合わせはこちら
              </p>
              <a
                href="mailto:support@tumiki.cloud"
                className="inline-flex items-center font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                <Mail className="mr-2 h-4 w-4" />
                support@tumiki.cloud
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </motion.div>

          {/* Auto Reload Notice */}
          <motion.p
            className="mt-8 text-xs text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            このページは5分ごとに自動更新されます
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default MaintenancePage;
