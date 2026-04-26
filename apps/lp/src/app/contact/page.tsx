"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { isFreeEmail } from "@/lib/contact-validation";

const COMPANY_SIZES = [
  "1〜50名",
  "51〜200名",
  "201〜500名",
  "501〜1,000名",
  "1,001名以上",
] as const;

const INTERESTS = [
  "導入相談",
  "技術検証（PoC）",
  "デモ希望",
  "料金について",
  "パートナー提携",
  "その他",
] as const;

const ContactPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const validateEmail = (email: string) => {
    if (isFreeEmail(email)) {
      setEmailError("法人メールアドレスをご入力ください");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);
    const getString = (fd: FormData, key: string): string =>
      (fd.get(key) as string | null) ?? "";

    if (!validateEmail(getString(data, "email"))) return;

    setIsSubmitting(true);
    setSubmitError("");

    const body = {
      name: getString(data, "name"),
      email: getString(data, "email"),
      company: getString(data, "company"),
      companySize: getString(data, "companySize"),
      role: getString(data, "role"),
      interest: getString(data, "interest"),
      message: getString(data, "message"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setSubmitError("送信に失敗しました。時間をおいて再度お試しください。");
        setIsSubmitting(false);
        return;
      }
    } catch {
      setSubmitError("送信に失敗しました。時間をおいて再度お試しください。");
      setIsSubmitting(false);
      return;
    }

    router.push("/contact/thanks");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-5 pt-24 pb-16">
      <div className="mx-auto max-w-xl">
        {/* ヘッダー */}
        <a
          href="/"
          className="mb-12 inline-block text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← トップに戻る
        </a>

        <h1 className="mb-3 text-3xl font-semibold text-white">お問い合わせ</h1>
        <p className="mb-10 text-sm text-zinc-400">
          導入のご相談から技術検証まで、専任チームがサポートします。
        </p>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 氏名 */}
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm text-zinc-300"
            >
              氏名 <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="山田 太郎"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 transition outline-none focus:border-white/20"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm text-zinc-300"
            >
              メールアドレス <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@company.co.jp"
              onChange={(e) => validateEmail(e.target.value)}
              className={`w-full rounded-lg border bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 transition outline-none focus:border-white/20 ${emailError ? "border-red-400/50" : "border-white/[0.08]"}`}
            />
            {emailError && (
              <p className="mt-1.5 text-xs text-red-400">{emailError}</p>
            )}
          </div>

          {/* 会社名 */}
          <div>
            <label
              htmlFor="company"
              className="mb-1.5 block text-sm text-zinc-300"
            >
              会社名 <span className="text-red-400">*</span>
            </label>
            <input
              id="company"
              name="company"
              type="text"
              required
              placeholder="株式会社○○"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 transition outline-none focus:border-white/20"
            />
          </div>

          {/* 従業員数 + 役職 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="companySize"
                className="mb-1.5 block text-sm text-zinc-300"
              >
                従業員数
              </label>
              <select
                id="companySize"
                name="companySize"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white transition outline-none focus:border-white/20"
              >
                <option value="" className="bg-zinc-900">
                  選択してください
                </option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size} className="bg-zinc-900">
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="role"
                className="mb-1.5 block text-sm text-zinc-300"
              >
                役職
              </label>
              <input
                id="role"
                name="role"
                type="text"
                placeholder="情報システム部 部長"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 transition outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* ご相談内容 */}
          <div>
            <label
              htmlFor="interest"
              className="mb-1.5 block text-sm text-zinc-300"
            >
              ご相談内容 <span className="text-red-400">*</span>
            </label>
            <select
              id="interest"
              name="interest"
              required
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white transition outline-none focus:border-white/20"
            >
              <option value="" className="bg-zinc-900">
                選択してください
              </option>
              {INTERESTS.map((item) => (
                <option key={item} value={item} className="bg-zinc-900">
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* 詳細・メッセージ */}
          <div>
            <label
              htmlFor="message"
              className="mb-1.5 block text-sm text-zinc-300"
            >
              詳細・ご質問
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              placeholder="導入を検討している背景や、ご質問などがあればお書きください"
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-zinc-600 transition outline-none focus:border-white/20"
            />
          </div>

          {/* 送信エラー */}
          {submitError && (
            <p className="rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3 text-center text-sm text-red-400">
              {submitError}
            </p>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-white py-3.5 text-sm font-medium text-black transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "送信中..." : "送信する"}
          </button>

          <p className="text-center text-[10px] text-zinc-600">
            送信いただいた情報は、お問い合わせへの対応にのみ使用します。
          </p>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;
