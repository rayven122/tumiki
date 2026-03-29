"use client";

import AnimateIn from "./AnimateIn";
import { Plate } from "./Plate";
import { floatStyle, mouseStyle, useMouse } from "./use-mouse";

/* ===== SVG 1: 重なるプレート群 ===== */
const ShieldPlates = ({ mx, my }: { mx: number; my: number }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    className="mx-auto h-44 w-44 md:h-52 md:w-52"
    style={{
      transform: `perspective(800px) rotateX(${my * -4}deg) rotateY(${mx * 4}deg)`,
      transition: "transform 0.2s ease-out",
    }}
  >
    {[
      { x: 100, y: 155, w: 130, h: 65, o: 0.1, depth: 0.2, d: 0 },
      { x: 100, y: 142, w: 118, h: 59, o: 0.15, depth: 0.4, d: 0.15 },
      { x: 100, y: 129, w: 106, h: 53, o: 0.2, depth: 0.6, d: 0.3 },
      { x: 100, y: 116, w: 94, h: 47, o: 0.28, depth: 0.8, d: 0.45 },
      { x: 100, y: 103, w: 82, h: 41, o: 0.38, depth: 1.0, d: 0.6 },
    ].map((p, i) => (
      <g key={i} style={mouseStyle(mx, my, p.depth)}>
        <g style={floatStyle(p.d)}>
          <Plate x={p.x} y={p.y} w={p.w} h={p.h} opacity={p.o} />
        </g>
      </g>
    ))}
    {/* 盾 */}
    <g style={mouseStyle(mx, my, 1.3)}>
      <g style={floatStyle(0.8)}>
        <path
          d="M100 72 L87 81 L87 96 L100 105 L113 96 L113 81 Z"
          fill="rgba(52,211,153,0.06)"
          stroke="rgba(52,211,153,0.35)"
          strokeWidth="0.8"
        />
        <circle
          cx="100"
          cy="89"
          r="4"
          fill="none"
          stroke="rgba(52,211,153,0.5)"
          strokeWidth="0.5"
          style={{ animation: "pillar-pulse 3s ease-in-out infinite" }}
        />
      </g>
    </g>
  </svg>
);

/* ===== SVG 2: isometricブロック群（階段状の立方体） ===== */
const BlockPlates = ({ mx, my }: { mx: number; my: number }) => {
  /* isometric立方体を描画 */
  const cube = (
    cx: number,
    cy: number,
    size: number,
    color: string,
    fillOpacity: number,
  ) => {
    const hw = size * 0.866; // cos30 * size
    const hh = size * 0.5;
    const h = size * 0.7; // 高さ
    return (
      <>
        {/* 上面 */}
        <path
          d={`M${cx},${cy - hh} L${cx + hw},${cy} L${cx},${cy + hh} L${cx - hw},${cy} Z`}
          fill={`rgba(${color},${fillOpacity * 1.5})`}
          stroke={`rgba(${color},0.3)`}
          strokeWidth="0.5"
        />
        {/* 左面 */}
        <path
          d={`M${cx - hw},${cy} L${cx},${cy + hh} L${cx},${cy + hh + h} L${cx - hw},${cy + h} Z`}
          fill={`rgba(${color},${fillOpacity})`}
          stroke={`rgba(${color},0.2)`}
          strokeWidth="0.5"
        />
        {/* 右面 */}
        <path
          d={`M${cx + hw},${cy} L${cx},${cy + hh} L${cx},${cy + hh + h} L${cx + hw},${cy + h} Z`}
          fill={`rgba(${color},${fillOpacity * 0.7})`}
          stroke={`rgba(${color},0.15)`}
          strokeWidth="0.5"
        />
      </>
    );
  };

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className="mx-auto h-44 w-44 md:h-52 md:w-52"
      style={{
        transform: `perspective(800px) rotateX(${my * -4}deg) rotateY(${mx * 4}deg)`,
        transition: "transform 0.2s ease-out",
      }}
    >
      {/* ブロック1（大、下） */}
      <g style={mouseStyle(mx, my, 0.3)}>
        <g style={floatStyle(0)}>{cube(80, 135, 38, "96,165,250", 0.06)}</g>
      </g>
      {/* ブロック2（中、中段） */}
      <g style={mouseStyle(mx, my, 0.7)}>
        <g style={floatStyle(0.4)}>{cube(120, 105, 32, "251,191,36", 0.06)}</g>
      </g>
      {/* ブロック3（小、上） */}
      <g style={mouseStyle(mx, my, 1.1)}>
        <g style={floatStyle(0.8)}>
          {cube(90, 75, 26, "167,139,250", 0.06)}
          <circle
            cx="90"
            cy="72"
            r="3"
            fill="none"
            stroke="rgba(167,139,250,0.5)"
            strokeWidth="0.5"
            style={{ animation: "pillar-pulse 2.5s ease-in-out infinite" }}
          />
        </g>
      </g>
    </svg>
  );
};

/* ===== SVG 3: 流れるプレート群 ===== */
const FlowPlates = ({ mx, my }: { mx: number; my: number }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    className="mx-auto h-44 w-44 md:h-52 md:w-52"
    style={{
      transform: `perspective(800px) rotateX(${my * -4}deg) rotateY(${mx * 4}deg)`,
      transition: "transform 0.2s ease-out",
    }}
  >
    {[
      { x: 45, y: 160, w: 110, h: 55, o: 0.1, depth: 0.15, d: 0 },
      { x: 58, y: 147, w: 102, h: 51, o: 0.14, depth: 0.3, d: 0.15 },
      { x: 71, y: 134, w: 94, h: 47, o: 0.18, depth: 0.45, d: 0.3 },
      { x: 84, y: 121, w: 86, h: 43, o: 0.24, depth: 0.6, d: 0.45 },
      { x: 97, y: 108, w: 78, h: 39, o: 0.32, depth: 0.8, d: 0.6 },
      { x: 110, y: 95, w: 70, h: 35, o: 0.4, depth: 1.0, d: 0.75 },
    ].map((p, i) => (
      <g key={i} style={mouseStyle(mx, my, p.depth)}>
        <g style={floatStyle(p.d)}>
          <Plate x={p.x} y={p.y} w={p.w} h={p.h} opacity={p.o} />
          <circle
            cx={p.x - p.w / 2 + 8}
            cy={p.y}
            r="1.5"
            fill={i === 3 ? "rgba(248,113,113,0.5)" : "rgba(52,211,153,0.4)"}
            style={{
              animation: `pillar-pulse 2s ease-in-out ${p.d}s infinite`,
            }}
          />
        </g>
      </g>
    ))}
  </svg>
);

/* ===== データ ===== */
const PILLARS = [
  {
    fig: "FIG 1.0",
    Svg: ShieldPlates,
    title: "全通信を監視",
    description:
      "AIクライアントとMCPサーバー間の全通信を中間で制御。不正なアクセスは即座に遮断。",
  },
  {
    fig: "FIG 1.1",
    Svg: BlockPlates,
    title: "きめ細かい権限制御",
    description:
      "役職・部署ごとにサービス単位のR/W/X権限を設定。必要最小限のアクセスを保証。",
  },
  {
    fig: "FIG 1.2",
    Svg: FlowPlates,
    title: "すべてを記録",
    description:
      "誰が、いつ、どのAIで、何をしたか。全MCP通信をオンプレミスに完全記録。",
  },
] as const;

/* ===== カラム ===== */
const PillarCard = ({
  pillar,
  delay,
}: {
  pillar: (typeof PILLARS)[number];
  delay: number;
}) => {
  const { ref, pos } = useMouse();
  const SvgComponent = pillar.Svg;
  return (
    <AnimateIn delay={delay}>
      <div ref={ref} className="cursor-default text-center md:text-left">
        <span className="mb-4 block font-mono text-[10px] tracking-wider text-zinc-600">
          {pillar.fig}
        </span>
        <div className="flex justify-center md:justify-start">
          <SvgComponent mx={pos.x} my={pos.y} />
        </div>
        <h3 className="mt-6 text-lg font-semibold text-white">
          {pillar.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {pillar.description}
        </p>
      </div>
    </AnimateIn>
  );
};

/* ===== メイン ===== */
const PillarsSection = () => (
  <section className="border-t border-white/[0.08] bg-gradient-to-b from-[#0a0a0a] to-[#0e0e12] py-24 md:py-32">
    <div className="mx-auto max-w-6xl px-5">
      <AnimateIn>
        <p className="mb-3 text-center font-mono text-xs font-medium tracking-widest text-zinc-500 uppercase">
          Architecture
        </p>
        <h2 className="mx-auto mb-16 max-w-2xl text-center text-2xl font-semibold tracking-tight text-white md:mb-20 md:text-4xl">
          3つのレイヤーで、<span className="text-zinc-500">会社を守る</span>
        </h2>
      </AnimateIn>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
        {PILLARS.map((pillar, i) => (
          <PillarCard key={pillar.fig} pillar={pillar} delay={i * 0.15} />
        ))}
      </div>
    </div>
  </section>
);

export default PillarsSection;
