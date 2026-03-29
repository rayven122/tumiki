import AnimateIn from "./AnimateIn";

const STATS = [
  {
    value: "75%",
    label: "APIがAIにより操作される時代へ",
  },
  {
    value: "33%",
    label: "AIによる業務の自律実行",
  },
  {
    value: "<1%",
    label: "統制基盤は未整備",
  },
] as const;

const ProblemSection = () => {
  return (
    <section
      id="problem"
      className="border-t border-white/[0.08] bg-[#0c0c0f] py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-5">
        {/* 見出し */}
        <AnimateIn>
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-white md:text-5xl">
            ガバナンスなきAI導入が、
            <br />
            企業を危険に晒す
          </h2>
        </AnimateIn>

        {/* サブコピー */}
        <AnimateIn delay={0.05}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-zinc-400">
            MCPプロトコルの急速な普及に、企業のセキュリティ体制が追いついていない。
            放置すれば、情報漏洩・不正アクセス・コンプライアンス違反は時間の問題。
          </p>
        </AnimateIn>

        {/* 統計数字 */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-8">
          {STATS.map((stat, i) => (
            <AnimateIn key={stat.value} delay={i * 0.1}>
              <div className="text-center">
                <span className="block text-5xl font-semibold text-white md:text-6xl">
                  {stat.value}
                </span>
                <span className="mt-3 block text-sm text-zinc-500">
                  {stat.label}
                </span>
              </div>
            </AnimateIn>
          ))}
        </div>

        {/* Gartner引用 */}
        <AnimateIn delay={0.3}>
          <p className="mt-12 text-center text-xs text-zinc-600">
            &ldquo;2026年までにAPIゲートウェイベンダーの75%がMCP機能を搭載する。
            しかしMCPは既存のAPI技術と同様のセキュリティ・ガバナンスリスクを伴う&rdquo;
            — Gartner, &ldquo;Innovation Insight for Model Context
            Protocol,&rdquo; 2025
          </p>
        </AnimateIn>
      </div>
    </section>
  );
};

export default ProblemSection;
