"use client";

import AnimateIn from "./AnimateIn";
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

/* ===== SVG 2: 回転リング型（中央ハブ + 5衛星が周回） ===== */
const ProtocolSvg = ({ mx, my }: { mx: number; my: number }) => {
  const satellites = [
    { angle: 0, label: "MCP", color: "255,255,255" },
    { angle: 72, label: "API", color: "251,191,36" },
    { angle: 144, label: "A2A", color: "96,165,250" },
    { angle: 216, label: "AP2", color: "52,211,153" },
    { angle: 288, label: "+", color: "167,139,250" },
  ] as const;

  const orbitR = 56;

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
      {/* === 軌道トラック（固定） === */}
      <g style={mouseStyle(mx, my, 0.1)}>
        <circle
          cx="100"
          cy="100"
          r={orbitR}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.6"
        />
        <circle
          cx="100"
          cy="100"
          r={orbitR - 16}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.4"
          strokeDasharray="3 5"
        />
        <circle
          cx="100"
          cy="100"
          r={orbitR + 16}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.3"
          strokeDasharray="2 6"
        />
      </g>

      {/* === 中央ハブ（固定、ラベルなし） === */}
      <g style={mouseStyle(mx, my, 0.4)}>
        <g style={floatStyle(0.15)}>
          <circle
            cx="100"
            cy="100"
            r="14"
            fill="rgba(255,255,255,0.03)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="0.7"
          />
          <circle cx="100" cy="100" r="4" fill="rgba(52,211,153,0.2)" />
        </g>
      </g>

      {/* === 回転する5衛星 === */}
      <g
        style={{
          transformOrigin: "100px 100px",
          animation: "orbit 28s linear infinite",
        }}
      >
        {satellites.map((sat) => {
          const rad = (sat.angle * Math.PI) / 180;
          const sx = Math.round((100 + orbitR * Math.cos(rad)) * 1000) / 1000;
          const sy = Math.round((100 + orbitR * Math.sin(rad)) * 1000) / 1000;
          return (
            <g key={sat.label}>
              {/* ハブへの接続線 */}
              <line
                x1={100}
                y1={100}
                x2={sx}
                y2={sy}
                stroke={`rgba(${sat.color},0.1)`}
                strokeWidth="0.4"
                strokeDasharray="2 3"
              />
              {/* ノード */}
              <circle
                cx={sx}
                cy={sy}
                r="13"
                fill={`rgba(${sat.color},0.04)`}
                stroke={`rgba(${sat.color},0.35)`}
                strokeWidth="0.7"
              />
              <circle cx={sx} cy={sy} r="3" fill={`rgba(${sat.color},0.15)`} />
              {/* ラベル（逆回転で水平維持） */}
              <text
                x={sx}
                y={sy + 4}
                textAnchor="middle"
                fill={`rgba(${sat.color},0.65)`}
                fontSize="7"
                fontFamily="monospace"
                style={{
                  transformOrigin: `${sx}px ${sy + 4}px`,
                  animation: "orbit 28s linear infinite reverse",
                }}
              >
                {sat.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/* アイソメトリック立方体ヘルパー */
const Block = ({
  cx,
  cy,
  size,
  color,
  fo,
}: {
  cx: number;
  cy: number;
  size: number;
  color: string;
  fo: number;
}) => {
  const hw = size * 0.866;
  const hh = size * 0.5;
  const h = size * 0.7;
  return (
    <>
      <path
        d={`M${cx},${cy - hh} L${cx + hw},${cy} L${cx},${cy + hh} L${cx - hw},${cy} Z`}
        fill={`rgba(${color},${fo * 1.5})`}
        stroke={`rgba(${color},0.3)`}
        strokeWidth="0.5"
      />
      <path
        d={`M${cx - hw},${cy} L${cx},${cy + hh} L${cx},${cy + hh + h} L${cx - hw},${cy + h} Z`}
        fill={`rgba(${color},${fo})`}
        stroke={`rgba(${color},0.2)`}
        strokeWidth="0.5"
      />
      <path
        d={`M${cx + hw},${cy} L${cx},${cy + hh} L${cx},${cy + hh + h} L${cx + hw},${cy + h} Z`}
        fill={`rgba(${color},${fo * 0.7})`}
        stroke={`rgba(${color},0.15)`}
        strokeWidth="0.5"
      />
    </>
  );
};

/* ===== SVG 3: Split-Plane（ブロック型） ===== */
const SplitPlaneSvg = ({ mx, my }: { mx: number; my: number }) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    className="mx-auto h-44 w-44 md:h-52 md:w-52"
    style={{
      transform: `perspective(800px) rotateX(${my * -4}deg) rotateY(${mx * 4}deg)`,
      transition: "transform 0.2s ease-out",
    }}
  >
    {/* === 上: VPC管理層（大きなブロック） === */}
    <g style={mouseStyle(mx, my, 0.7)}>
      <g style={floatStyle(0.3)}>
        <Block cx={100} cy={62} size={38} color="255,255,255" fo={0.05} />
      </g>
    </g>

    {/* === VPC→Desktopへの接続線 === */}
    {[45, 100, 155].map((cx, i) => (
      <g key={`conn-${i}`} style={mouseStyle(mx, my, 0.2)}>
        <line
          x1={100}
          y1={95}
          x2={cx}
          y2={130}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
          strokeDasharray="3 4"
        />
      </g>
    ))}

    {/* === 下: 3つのDesktopブロック === */}
    {[
      { cx: 45, depth: 0.25, d: 0 },
      { cx: 100, depth: 0.4, d: 0.12 },
      { cx: 155, depth: 0.55, d: 0.24 },
    ].map((b, i) => (
      <g key={`desktop-${i}`} style={mouseStyle(mx, my, b.depth)}>
        <g style={floatStyle(b.d)}>
          <Block cx={b.cx} cy={140} size={22} color="52,211,153" fo={0.06} />
          {/* 盾マーク */}
          <path
            d={`M${b.cx} ${140 - 4} L${b.cx - 3} ${140 - 1.5} L${b.cx - 3} ${140 + 1.5} L${b.cx} ${140 + 4} L${b.cx + 3} ${140 + 1.5} L${b.cx + 3} ${140 - 1.5} Z`}
            fill="rgba(52,211,153,0.04)"
            stroke="rgba(52,211,153,0.3)"
            strokeWidth="0.4"
          />
          <circle
            cx={b.cx}
            cy={140}
            r="2"
            fill="none"
            stroke="rgba(52,211,153,0.4)"
            strokeWidth="0.3"
            style={{
              animation: `pillar-pulse 3s ease-in-out ${i * 0.5}s infinite`,
            }}
          />
        </g>
      </g>
    ))}

    {/* ラベル */}
    {[45, 100, 155].map((cx, i) => (
      <text
        key={`label-${i}`}
        x={cx}
        y={168}
        textAnchor="middle"
        fill="rgba(255,255,255,0.12)"
        fontSize="6"
        fontFamily="monospace"
      >
        Desktop
      </text>
    ))}
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
