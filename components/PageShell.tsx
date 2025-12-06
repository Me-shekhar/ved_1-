type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <section className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      <header className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">CathShield.ai</p>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {actions ?? <span className="text-xs text-slate-400">mobile care</span>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
