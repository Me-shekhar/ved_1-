"use client";

import { useEffect } from 'react';
import useSWR from 'swr';
import PageShell from '@/components/PageShell';
import WorkflowGuard from '@/components/WorkflowGuard';
import AlertCard from '@/components/AlertCard';
import { useWorkflow } from '@/context/WorkflowContext';
import { fetcher } from '@/lib/fetcher';

export default function AlertsPage() {
  const { patientId, stage, advanceTo } = useWorkflow();
  const { data, mutate } = useSWR(patientId ? `/api/alerts?patientId=${patientId}` : '/api/alerts', fetcher, {
    refreshInterval: 15000
  });

  useEffect(() => {
    if (stage === 'alerts') {
      advanceTo('ward');
    }
  }, [stage, advanceTo]);

  const acknowledge = async (id: string) => {
    await fetch(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' });
    mutate();
  };

  return (
    <WorkflowGuard requiredStage="alerts">
      <PageShell title="Clinical Alerts" subtitle="High-signal events first">
        {!data ? <p className="text-sm text-slate-500">Loading alerts...</p> : null}
        {data?.alerts?.length ? (
          data.alerts.map((alert: any) => (
            <AlertCard
              key={alert.id}
              title={alert.type.replace('_', ' ')}
              reason={alert.reason}
              severity={alert.severity}
              timestamp={alert.createdAt}
              acknowledged={alert.acknowledged}
              recommendedAction={alert.recommendedAction}
              onAcknowledge={() => acknowledge(alert.id)}
            />
          ))
        ) : (
          <p className="text-sm text-slate-500">No alerts right now.</p>
        )}
      </PageShell>
    </WorkflowGuard>
  );
}
