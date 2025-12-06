"use client";

import { useEffect } from 'react';
import useSWR from 'swr';
import PageShell from '@/components/PageShell';
import WorkflowGuard from '@/components/WorkflowGuard';
import { useWorkflow } from '@/context/WorkflowContext';
import { fetcher } from '@/lib/fetcher';

export default function WardAnalyticsPage() {
  const { stage, advanceTo } = useWorkflow();
  const { data } = useSWR('/api/ward-metrics', fetcher, { refreshInterval: 60000 });

  useEffect(() => {
    if (stage === 'ward') {
      advanceTo('resource');
    }
  }, [stage, advanceTo]);

  const metrics = data?.metrics?.[0];
  const trend = data?.metrics ?? [];
  const delta = data?.delta ?? 0;

  return (
    <WorkflowGuard requiredStage="ward">
      <PageShell title="Ward Analytics" subtitle="CLABSI per 1000 line days">
        {!metrics ? <p className="text-sm text-slate-500">Loading ward metrics...</p> : null}
        {metrics ? (
          <>
            <section className="card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
              <p className="text-3xl font-semibold">{metrics.derivedRate.toFixed(1)}</p>
              <p className="text-sm text-slate-600">CLABSI / 1000 catheter-days</p>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 pt-2">
                <div>
                  <p className="text-xs text-slate-500">Line days</p>
                  <p className="font-semibold">{metrics.totalCentralLineDays}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CLABSI cases</p>
                  <p className="font-semibold">{metrics.clabsiCases}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dressing changes</p>
                  <p className="font-semibold">{metrics.dressingChangeCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Catheter changes</p>
                  <p className="font-semibold">{metrics.catheterChangeCount}</p>
                </div>
              </div>
              <p className={`text-sm font-semibold ${delta < 0 ? 'text-risk-green' : 'text-risk-red'}`}>
                {delta < 0 ? '↓' : '↑'} {Math.abs(delta).toFixed(1)}% vs last 30 days
              </p>
            </section>

            <section className="card space-y-3">
              <p className="text-sm font-semibold">CLABSI rate trend</p>
              <svg viewBox="0 0 320 140" className="w-full" role="img">
                <polyline
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth={3}
                  points={trend
                    .map((point: any, index: number) => {
                      const x = (index / Math.max(trend.length - 1, 1)) * 320;
                      const y = 140 - (point.derivedRate / 10) * 140;
                      return `${x},${Math.max(Math.min(y, 140), 0)}`;
                    })
                    .join(' ')}
                />
              </svg>
            </section>
          </>
        ) : null}
      </PageShell>
    </WorkflowGuard>
  );
}
