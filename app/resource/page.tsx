"use client";

import { FormEvent, useState } from 'react';
import PageShell from '@/components/PageShell';
import WorkflowGuard from '@/components/WorkflowGuard';
import { useWorkflow } from '@/context/WorkflowContext';

export default function ResourcePage() {
  const { reset } = useWorkflow();
  const [form, setForm] = useState({ patients: 0, dressings: 0, catheters: 0, wardId: 'CVL-01' });
  const [result, setResult] = useState<any>();
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      const res = await fetch('/api/resource-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setResult(data.metric);
    } finally {
      setPending(false);
    }
  };

  return (
    <WorkflowGuard requiredStage="resource">
      <PageShell title="Resource Readiness" subtitle="Track deprivation rate">
        <form className="card space-y-3" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-700">
            Ward ID
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.wardId}
              onChange={(event) => setForm((prev) => ({ ...prev, wardId: event.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Patients needing catheter/dressing today
            <input
              type="number"
              min={0}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.patients}
              onChange={(event) => setForm((prev) => ({ ...prev, patients: Number(event.target.value) }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Available dressings
            <input
              type="number"
              min={0}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.dressings}
              onChange={(event) => setForm((prev) => ({ ...prev, dressings: Number(event.target.value) }))}
            />
          </label>
          <label className="text-sm text-slate-700">
            Available catheters
            <input
              type="number"
              min={0}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={form.catheters}
              onChange={(event) => setForm((prev) => ({ ...prev, catheters: Number(event.target.value) }))}
            />
          </label>
          <button type="submit" disabled={pending} className="w-full rounded-full bg-teal text-white py-3 font-semibold">
            Compute deprivation rate
          </button>
        </form>

        {result ? (
          <section className="card space-y-2">
            <p className="text-sm font-semibold">Combined Deprivation</p>
            <p className="text-3xl font-semibold">{result.combinedRate.toFixed(1)}%</p>
            <p className={`text-sm font-semibold ${bandClass[result.band]}`}>
              {result.band === 'green'
                ? 'Safe'
                : result.band === 'red'
                ? 'Critical shortage'
                : result.combinedRate > 30
                ? 'Major shortage'
                : 'Shortage'}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">DDR</p>
                <p className="font-semibold">{result.dressingsDeficitRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">CDR</p>
                <p className="font-semibold">{result.cathetersDeficitRate.toFixed(1)}%</p>
              </div>
            </div>
            {result.alert ? (
              <p className="text-sm text-risk-red font-semibold">Supply alert created for admin response.</p>
            ) : null}
            <button type="button" onClick={reset} className="w-full rounded-full border border-slate-200 py-2 text-sm">
              Close workflow loop
            </button>
          </section>
        ) : null}
      </PageShell>
    </WorkflowGuard>
  );
}

const bandClass: Record<string, string> = {
  green: 'text-risk-green',
  yellow: 'text-risk-yellow',
  red: 'text-risk-red'
};

