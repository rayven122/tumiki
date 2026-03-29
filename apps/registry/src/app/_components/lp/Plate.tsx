/** isometricプレート（SVGダイヤモンド形状） */
export const Plate = ({
  x,
  y,
  w,
  h,
  opacity,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}) => {
  const hw = w / 2;
  const hh = h / 2;
  return (
    <path
      d={`M${x} ${y - hh} L${x + hw} ${y} L${x} ${y + hh} L${x - hw} ${y} Z`}
      fill={`rgba(255,255,255,${opacity * 0.06})`}
      stroke={`rgba(255,255,255,${opacity})`}
      strokeWidth="0.5"
    />
  );
};
