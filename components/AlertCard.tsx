type Props = {
  title: string;
  reason: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  recommendedAction: string;
  onAcknowledge?: () => void;
};

const severityTone: Record<Props['severity'], string> = {
  info: 'bg-medical/10 text-medical',
  warning: 'bg-risk-yellow/15 text-risk-yellow',
  critical: 'bg-risk-red/15 text-risk-red'
};

export default function AlertCard({
  title,
  reason,
  severity,
  timestamp,
  acknowledged,
  recommendedAction,
  onAcknowledge
}: Props) {
  return (
    <article className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${severityTone[severity]}`}>{severity.toUpperCase()}</span>
      </div>
      <p className="text-sm text-slate-700">{reason}</p>
      <p className="text-xs text-slate-500">{new Date(timestamp).toLocaleString()}</p>
      <div className="bg-slate-100 rounded-xl px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Recommended action</p>
        <p className="text-sm font-semibold">{recommendedAction}</p>
      </div>
      <button
        type="button"
        className="w-full rounded-full bg-teal text-white py-2 text-sm font-semibold"
        onClick={onAcknowledge}
        disabled={acknowledged}
      >
        {acknowledged ? 'Acknowledged' : 'Mark as acknowledged'}
      </button>
    </article>
  );
}
