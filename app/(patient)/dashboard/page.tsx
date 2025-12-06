"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import PageShell from '@/components/PageShell';
import WorkflowGuard from '@/components/WorkflowGuard';
import RiskBadge from '@/components/RiskBadge';
import RecommendedActionCard from '@/components/RecommendedActionCard';
import TrendChart from '@/components/TrendChart';
import { useWorkflow } from '@/context/WorkflowContext';
import { fetcher } from '@/lib/fetcher';

export default function DashboardPage() {
  const { patientId, stage, advanceTo } = useWorkflow();
  const { data, error } = useSWR(patientId ? `/api/dashboard?patientId=${patientId}` : null, fetcher);
  const [showClisa, setShowClisa] = useState(false);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (stage === 'dashboard') {
      advanceTo('alerts');
    }
  }, [stage, advanceTo]);

  if (!patientId) {
    return <p className="px-4 py-8 text-center text-sm">Select a patient to view the dashboard.</p>;
  }

  return (
    <WorkflowGuard requiredStage="dashboard">
      <PageShell title="Patient Dashboard" subtitle="Continuous surveillance">
        {error ? <p className="text-sm text-risk-red">Unable to load dashboard.</p> : null}
        {!data ? <p className="text-sm text-slate-500">Loading...</p> : null}
        {data ? (
          <>
            <section className="card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Patient summary</p>
              <h2 className="text-xl font-semibold">Bed {data.patient.bedNumber} - {data.patient.initials}</h2>
              <p className="text-sm text-slate-600">Insertion {data.patient.daysSinceInsertion} days ago ({data.patient.insertionDate})</p>
            </section>

            <section className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">CLISA score</p>
                  <p className="text-3xl font-semibold">{data.riskSnapshot?.clisaScore ?? '—'}</p>
                </div>
                {data.riskSnapshot ? (
                  <RiskBadge level={data.riskSnapshot.predictiveClabsiBand} label={`CLABSI ${data.riskSnapshot.predictiveClabsiBand.toUpperCase()}`} />
                ) : null}
              </div>
              {data.riskSnapshot ? (
                <div className="flex flex-wrap gap-2">
                  <RiskBadge level={data.riskSnapshot.predictiveVenousResistanceBand} label={`Venous ${data.riskSnapshot.predictiveVenousResistanceBand.toUpperCase()}`} />
                  <span className="text-sm text-slate-600">Traction Y/R: {data.riskSnapshot.tractionPullsYellow}/{data.riskSnapshot.tractionPullsRed}</span>
                </div>
              ) : null}
            </section>

            {data.riskSnapshot ? (
              <RecommendedActionCard
                band={data.riskSnapshot.predictiveClabsiBand}
                action={data.riskSnapshot.recommendedAction}
              />
            ) : null}

            <section className="card space-y-2">
              <p className="text-sm font-semibold text-slate-700">Latest catheter-site image</p>
              {data.latestCapture ? (
                <button type="button" onClick={() => setShowImage(true)} className="w-full">
                  <Image
                    src={data.latestCapture.imageUrl}
                    alt="Latest catheter image"
                    width={320}
                    height={240}
                    className="rounded-2xl object-cover"
                    unoptimized
                  />
                </button>
              ) : (
                <p className="text-sm text-slate-500">No capture yet.</p>
              )}
            </section>

            <section className="card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">12-hour trend</p>
                <button type="button" className="text-xs text-teal" onClick={() => setShowClisa(true)}>
                  View CLISA reference
                </button>
              </div>
              <TrendChart data={data.trend ?? []} />
            </section>

            {showClisa ? <ClisaModal onClose={() => setShowClisa(false)} /> : null}
            {showImage && data?.latestCapture ? (
              <ImageModal imageUrl={data.latestCapture.imageUrl} onClose={() => setShowImage(false)} />
            ) : null}
          </>
        ) : null}
      </PageShell>
    </WorkflowGuard>
  );
}

type ModalProps = {
  onClose: () => void;
};

const clisaReference = [
  { score: '0-1', meaning: 'Clean, intact dressing', action: 'Routine care' },
  { score: '2-3', meaning: 'Mild erythema / ooze', action: 'Reinforce dressing, review in 12h' },
  { score: '4+', meaning: 'Significant drainage, maceration, device lift', action: 'Replace dressing, escalate to MO' }
];

function ClisaModal({ onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-2xl bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">CLISA Reference</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">
            Close
          </button>
        </div>
        <div className="space-y-2">
          {clisaReference.map((row) => (
            <div key={row.score} className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-sm font-semibold">Score {row.score}</p>
              <p className="text-xs text-slate-600">{row.meaning}</p>
              <p className="text-xs text-teal font-semibold">{row.action}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageModal({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal>
      <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Latest capture</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500">
            Close
          </button>
        </div>
        <Image src={imageUrl} alt="Catheter capture" width={360} height={360} className="rounded-2xl" unoptimized />
      </div>
    </div>
  );
}
