"use client";

import AnimateIn from "./AnimateIn";
import { Plate } from "./Plate";
import { floatStyle, mouseStyle, useMouse } from "./use-mouse";

/* ===== SVG 1: 特許（ロック+同心円シールド） ===== */
const PatentSvg = ({ mx, my }: { mx: number; my: number }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    className="mx-auto h-40 w-40 md:h-48 md:w-48"
    style={{
      transform: `perspective(800px) rotateX(${my * -4}deg) rotateY(${mx * 4}deg)`,
      transition: "transform 0.2s ease-out",
    }}
  >
    {/* 外側リング */}
    <g style={mouseStyle(mx, my, 0.2)}>
      <g style={floatStyle(0)}>
        <circle
          cx="100"
          cy="100"
          r="75"
          fill="none"
          stroke="rgba(52,211,153,0.06)"
          strokeWidth="0.5"
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="none"
          stroke="rgba(52,211,153,0.1)"
          strokeWidth="0.5"
          strokeDasharray="4 6"
        />
      </g>
    </g>
    {/* 中間リング（回転アニメーション） */}
    <g style={mouseStyle(mx, my, 0.5)}>
      <g style={floatStyle(0.2)}>
        <circle
          cx="100"
          cy="100"
          r="45"
          fill="none"
          stroke="rgba(52,211,153,0.15)"
          strokeWidth="0.8"
          strokeDasharray="8 12"
          style={{ animation: "pillar-slide 20s linear infinite" }}
        />
      </g>
    </g>
    {/* シールド本体 */}
    <g style={mouseStyle(mx, my, 0.8)}>
      <g style={floatStyle(0.4)}>
        <path
          d="M100,58 L72,72 L72,108 L100,125 L128,108 L128,72 Z"
          fill="rgba(52,211,153,0.06)"
          stroke="rgba(52,211,153,0.3)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
    </g>
    {/* 南京錠（固定、マウスホバーでSVG全体が動く） */}
    <g>
      <path
        d="M92,88 L92,78 A8,8 0 0 1 108,78 L108,88"
        fill="none"
        stroke="rgba(52,211,153,0.6)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="88"
        y="88"
        width="24"
        height="20"
        rx="3"
        fill="rgba(52,211,153,0.08)"
        stroke="rgba(52,211,153,0.5)"
        strokeWidth="1"
      />
      <circle cx="100" cy="96" r="3" fill="rgba(52,211,153,0.3)" />
      <path d="M99,98 L99,104 L101,104 L101,98" fill="rgba(52,211,153,0.3)" />
    </g>
  </svg>
);

/* ===== SVG 2: 4プロトコル（4つの接続ノード） ===== */
const ProtocolSvg = ({ mx, my }: { mx: number; my: number }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    className="mx-auto h-40 w-40 md:h-48 md:w-48"
    style={{
      transform: `perspective(800px) rotateX(${my * -4}deg) rotateY(${mx * 4}deg)`,
      transition: "transform 0.2s ease-out",
    }}
  >
    {/* 中央ハブ（固定） */}
    <g>
      <circle
        cx="100"
        cy="100"
        r="18"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.8"
      />
      <circle cx="100" cy="100" r="5" fill="rgba(96,165,250,0.3)" />
    </g>
    {/* 5つのノード + 接続線（固定、SVG全体がマウスで動く） */}
    {[
      { x: 100, y: 40, label: "MCP", color: "255,255,255", pulse: false },
      { x: 40, y: 80, label: "A2A", color: "96,165,250", pulse: false },
      { x: 160, y: 80, label: "API", color: "251,191,36", pulse: false },
      { x: 55, y: 150, label: "AP2", color: "52,211,153", pulse: false },
      { x: 145, y: 150, label: "+", color: "167,139,250", pulse: true },
    ].map((node) => (
      <g key={node.label}>
        <line
          x1="100"
          y1="100"
          x2={node.x}
          y2={node.y}
          stroke={`rgba(${node.color},0.1)`}
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />
        <circle
          cx={node.x}
          cy={node.y}
          r="20"
          fill="rgba(255,255,255,0.02)"
          stroke={`rgba(${node.color},0.3)`}
          strokeWidth="0.5"
        />
        <text
          x={node.x}
          y={node.y + 4}
          textAnchor="middle"
          fill={`rgba(${node.color},0.5)`}
          fontSize="12"
          fontFamily="monospace"
          style={
            node.pulse
              ? { animation: "pillar-pulse 2s ease-in-out infinite" }
              : undefined
          }
        >
          {node.label}
        </text>
      </g>
    ))}
  </svg>
);

/* ===== SVG 3: Split-Plane（左右分離+接続線上をドットが流れる） ===== */
const SplitPlaneSvg = ({ mx, my }: { mx: number; my: number }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    className="mx-auto h-40 w-40 md:h-48 md:w-48"
    style={{
      transform: `perspective(800px) rotateX(${my * -4}deg) rotateY(${mx * 4}deg)`,
      transition: "transform 0.2s ease-out",
    }}
  >
    {/* 左: オンプレ */}
    <g style={mouseStyle(mx, my, 0.5)}>
      <g style={floatStyle(0)}>
        <Plate x={50} y={80} w={65} h={55} opacity={0.2} />
        <Plate x={50} y={100} w={65} h={55} opacity={0.15} />
        <Plate x={50} y={120} w={65} h={55} opacity={0.1} />
      </g>
    </g>
    {/* 右: クラウド */}
    <g style={mouseStyle(mx, my, 0.8)}>
      <g style={floatStyle(0.4)}>
        <Plate x={150} y={85} w={55} h={45} opacity={0.25} />
        <Plate x={150} y={105} w={55} h={45} opacity={0.2} />
      </g>
    </g>

    {/* 接続線（左プレートから右プレートへ） */}
    <g style={mouseStyle(mx, my, 0.3)}>
      <line
        x1="75"
        y1="90"
        x2="125"
        y2="90"
        stroke="rgba(52,211,153,0.1)"
        strokeWidth="0.5"
        strokeDasharray="3 3"
      />
      <line
        x1="75"
        y1="110"
        x2="125"
        y2="110"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.5"
        strokeDasharray="3 3"
      />
    </g>

    {/* 左→右: 統計データ送信ドット */}
    <circle
      cx="75"
      cy="90"
      r="2.5"
      fill="rgba(52,211,153,0.8)"
      style={{ animation: "dot-lr 2s ease-in-out infinite" }}
    />
    <circle
      cx="75"
      cy="90"
      r="2"
      fill="rgba(52,211,153,0.4)"
      style={{ animation: "dot-lr 2s ease-in-out 0.6s infinite" }}
    />

    {/* 右→左: ポリシー配信ドット */}
    <circle
      cx="125"
      cy="110"
      r="2"
      fill="rgba(255,255,255,0.6)"
      style={{ animation: "dot-rl 2.5s ease-in-out infinite" }}
    />
    <circle
      cx="125"
      cy="110"
      r="1.5"
      fill="rgba(255,255,255,0.3)"
      style={{ animation: "dot-rl 2.5s ease-in-out 0.8s infinite" }}
    />

    {/* 中央の分離線 */}
    <g style={mouseStyle(mx, my, 0.2)}>
      <line
        x1="100"
        y1="55"
        x2="100"
        y2="155"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.5"
        strokeDasharray="2 4"
      />
    </g>

    {/* ラベル */}
    <text
      x="50"
      y="155"
      textAnchor="middle"
      fill="rgba(255,255,255,0.15)"
      fontSize="7"
      fontFamily="monospace"
    >
      ON-PREM
    </text>
    <text
      x="150"
      y="155"
      textAnchor="middle"
      fill="rgba(255,255,255,0.15)"
      fontSize="7"
      fontFamily="monospace"
    >
      CLOUD
    </text>
    <text
      x="100"
      y="82"
      textAnchor="middle"
      fill="rgba(52,211,153,0.2)"
      fontSize="5"
      fontFamily="monospace"
    >
      統計 →
    </text>
    <text
      x="100"
      y="122"
      textAnchor="middle"
      fill="rgba(255,255,255,0.15)"
      fontSize="5"
      fontFamily="monospace"
    >
      ← ポリシー
    </text>
  </svg>
);

/* ===== データ ===== */
const TRUST_ITEMS = [
  {
    fig: "FIG 2.0",
    Svg: PatentSvg,
    title: "特許技術で保護",
    description: "独自技術で通信を保護",
  },
  {
    fig: "FIG 2.1",
    Svg: ProtocolSvg,
    title: "主要プロトコルに対応",
    description: "今後のプロトコルにも順次拡張",
  },
  {
    fig: "FIG 2.2",
    Svg: SplitPlaneSvg,
    title: "Split-Plane構成",
    description: "機密データは社外に出ない",
  },
] as const;

/* ===== カラム ===== */
const TrustCard = ({
  item,
  delay,
}: {
  item: (typeof TRUST_ITEMS)[number];
  delay: number;
}) => {
  const { ref, pos } = useMouse();
  const SvgComponent = item.Svg;
  return (
    <AnimateIn delay={delay}>
      <div ref={ref} className="cursor-default text-center">
        <span className="mb-4 block font-mono text-[10px] tracking-wider text-zinc-600">
          {item.fig}
        </span>
        <SvgComponent mx={pos.x} my={pos.y} />
        <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
        <p className="mt-2 text-sm text-zinc-500">{item.description}</p>
      </div>
    </AnimateIn>
  );
};

/* ===== メイン ===== */
const TrustSection = () => (
  <section className="border-t border-white/[0.08] bg-gradient-to-b from-[#0c0c0e] to-[#0a0a0a] py-24 md:py-32">
    <div className="mx-auto max-w-6xl px-5">
      <AnimateIn>
        <p className="mb-3 text-center font-mono text-xs font-medium tracking-widest text-zinc-500 uppercase">
          Foundation
        </p>
        <h2 className="mx-auto mb-16 max-w-2xl text-center text-2xl font-semibold tracking-tight text-white md:mb-20 md:text-4xl">
          安心して任せられる、
          <span className="text-zinc-500">技術基盤</span>
        </h2>
      </AnimateIn>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
        {TRUST_ITEMS.map((item, i) => (
          <TrustCard key={item.fig} item={item} delay={i * 0.15} />
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
