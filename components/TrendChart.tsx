"use client";

type RiskPoint = {
  timestamp: string;
  score: number;
  band: 'green' | 'yellow' | 'red';
  dressingChange?: boolean;
  catheterChange?: boolean;
  flushing?: boolean;
};

type Props = {
  data: RiskPoint[];
};

const bandColor: Record<'green' | 'yellow' | 'red', string> = {
  green: '#16a34a',
  yellow: '#ca8a04',
  red: '#dc2626'
};

export default function TrendChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">Trend data will appear after the first capture.</p>;
  }

  const scores = data.map((point) => point.score);
  const maxScore = Math.max(...scores, 10);
  const minScore = 0;
  const height = 160;
  const width = 320;
  const step = width / Math.max(data.length - 1, 1);

  const points = data.map((point, index) => {
    const x = index * step;
    const normalized = (point.score - minScore) / (maxScore - minScore || 1);
    const y = height - normalized * height;
    return { ...point, x, y };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="12-hour risk trend">
      <polyline
        fill="none"
        stroke="#0f766e"
        strokeWidth={2}
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <g key={point.timestamp + index}>
          <circle cx={point.x} cy={point.y} r={6} fill={bandColor[point.band]} />
          {point.dressingChange ? (
            <text x={point.x} y={point.y - 14} textAnchor="middle" fontSize="10" fill="#0f172a">
              ⚪
            </text>
          ) : null}
          {point.catheterChange ? (
            <text x={point.x + 10} y={point.y - 4} fontSize="10" fill="#0f172a">
              ⚫
            </text>
          ) : null}
          {point.flushing ? (
            <text x={point.x - 10} y={point.y - 4} fontSize="10" fill="#581c87">
              🟣
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
