/** CTA - お問い合わせセクション */

import AnimateIn from "./AnimateIn";

const CtaSection = () => {
  return (
    <section
      id="cta"
      className="border-t border-white/[0.08] bg-gradient-to-b from-[#0f0f12] to-[#0a0a0a] py-24 md:py-32"
    >
      <div className="mx-auto max-w-3xl px-5 text-center">
        <AnimateIn>
          <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            社内AIの管理を、今日から始める
          </h2>
        </AnimateIn>

        <AnimateIn delay={0.1}>
          <p className="mt-4 text-zinc-400">
            導入のご相談から技術検証まで、専任チームがサポートします。
          </p>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/contact"
              className="inline-flex min-h-[44px] items-center rounded-full bg-white px-8 py-3.5 text-sm font-medium text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              お問い合わせ
            </a>
            <a
              href="/contact"
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/[0.1] px-7 py-3.5 text-sm text-zinc-400 transition-all hover:border-white/[0.2] hover:text-white"
            >
              デモを申し込む
            </a>
          </div>
        </AnimateIn>

        {/* パートナーリンク */}
        <AnimateIn delay={0.3}>
          <p className="mt-16 text-xs text-zinc-600">
            OEM・ホワイトラベル・パートナー提携をご検討の方は{" "}
            <a
              href="/contact?type=partner"
              className="text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-400"
            >
              こちらからお問い合わせ
            </a>
            ください
          </p>
        </AnimateIn>
      </div>
    </section>
  );
};

export default CtaSection;
