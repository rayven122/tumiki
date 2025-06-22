"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitingListModal({ isOpen, onClose }: WaitingListModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    company: "",
    useCase: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setIsSubmitting(false);
      onClose();
      setFormData({ email: "", name: "", company: "", useCase: "" });
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-opacity-80 fixed inset-0 z-50 flex items-center justify-center bg-black p-4 backdrop-blur-sm">
      <motion.div
        className="relative w-full max-w-lg border-4 border-black bg-white p-10 shadow-[8px_8px_0_#6366f1]"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-3xl font-black text-black transition-transform duration-300 hover:rotate-90"
        >
          ×
        </button>

        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-black text-black">
            早期アクセスに登録
          </h2>
          <p className="text-gray-600">AIブロックの革命に参加しよう</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold tracking-wide text-black uppercase">
                メールアドレス *
              </label>
              <input
                type="email"
                required
                className="w-full border-2 border-black p-3 transition-all focus:shadow-[4px_4px_0_#6366f1] focus:outline-none"
                placeholder="you@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold tracking-wide text-black uppercase">
                お名前 *
              </label>
              <input
                type="text"
                required
                className="w-full border-2 border-black p-3 transition-all focus:shadow-[4px_4px_0_#6366f1] focus:outline-none"
                placeholder="山田 太郎"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold tracking-wide text-black uppercase">
                会社名
              </label>
              <input
                type="text"
                className="w-full border-2 border-black p-3 transition-all focus:shadow-[4px_4px_0_#6366f1] focus:outline-none"
                placeholder="株式会社〇〇"
                value={formData.company}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, company: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold tracking-wide text-black uppercase">
                利用予定の用途
              </label>
              <select
                className="w-full border-2 border-black p-3 transition-all focus:shadow-[4px_4px_0_#6366f1] focus:outline-none"
                value={formData.useCase}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, useCase: e.target.value }))
                }
              >
                <option value="">選択してください</option>
                <option value="automation">業務自動化</option>
                <option value="customer-support">カスタマーサポート</option>
                <option value="data-analysis">データ分析</option>
                <option value="development">開発支援</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={isSubmitting || isSubmitted}
            className="mt-8 w-full border-3 border-black bg-black p-4 text-lg font-bold tracking-wider text-white uppercase shadow-[4px_4px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[7px_7px_0_#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent" />
                登録中...
              </div>
            ) : isSubmitted ? (
              "✓ 登録完了！"
            ) : (
              "登録する"
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}