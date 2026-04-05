import AnimateIn from "./AnimateIn";

const STATS = [
  { value: "75%", label: "APIの大半がMCP対応へ" },
  { value: "40%", label: "会社のソフトにAIが組み込まれる" },
  { value: "<5%", label: "AIの行動を制御できている企業" },
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

        <AnimateIn delay={0.05}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-zinc-400">
            AIは、すでに「業務を実行する存在」になりつつある。
            <br />
            しかし、その行動を制御・監査する仕組みは整っていない。 <br />
            放置すれば、 AIが無断でデータを操作し、
            企業はその責任を説明できなくなる。
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
                <span className="mt-3 block text-sm text-zinc-400">
                  {stat.label}
                </span>
              </div>
            </AnimateIn>
          ))}
        </div>

        {/* Gartner引用 */}
        <AnimateIn delay={0.3}>
          <p className="mt-12 text-center text-xs text-zinc-600">
            出典: Gartner, &ldquo;Innovation Insight for Model Context
            Protocol,&rdquo; 2025
          </p>
        </AnimateIn>
      </div>
    </section>
  );
};

export default ProblemSection;
