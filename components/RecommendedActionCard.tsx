type Props = {
  band: 'green' | 'yellow' | 'red';
  action: string;
};

const bgMap = {
  green: 'bg-risk-green/10 text-risk-green',
  yellow: 'bg-risk-yellow/10 text-risk-yellow',
  red: 'bg-risk-red/10 text-risk-red'
};

export default function RecommendedActionCard({ band, action }: Props) {
  return (
    <div className={`card ${bgMap[band]} border border-transparent`}>
      <p className="text-xs uppercase tracking-wide">Recommended Action</p>
      <p className="text-base font-semibold">{action}</p>
    </div>
  );
}
