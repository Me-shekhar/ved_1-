type RiskLevel = 'green' | 'yellow' | 'red';

type Props = {
  level: RiskLevel;
  label: string;
};

const map: Record<RiskLevel, string> = {
  green: 'bg-risk-green/15 text-risk-green border-risk-green/60',
  yellow: 'bg-risk-yellow/15 text-risk-yellow border-risk-yellow/60',
  red: 'bg-risk-red/15 text-risk-red border-risk-red/60'
};

export default function RiskBadge({ level, label }: Props) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${map[level]}`}>{label}</span>
  );
}
