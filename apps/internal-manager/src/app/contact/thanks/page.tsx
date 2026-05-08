const ThanksPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-5">
      {/* チェックマーク */}
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
        <svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="mb-3 text-3xl font-semibold text-white">
        お問い合わせありがとうございます
      </h1>
      <p className="mb-10 max-w-md text-center text-zinc-400">
        担当者より2営業日以内にご連絡いたします。
      </p>

      <a
        href="/"
        className="mt-4 text-sm text-zinc-500 transition-colors hover:text-white"
      >
        ← トップに戻る
      </a>
    </div>
  );
};

export default ThanksPage;
