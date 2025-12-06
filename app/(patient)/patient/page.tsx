"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import { useWorkflow } from '@/context/WorkflowContext';

type PatientForm = {
  bedNumber: string;
  initials: string;
  insertionDate: string;
  wardId: string;
  patientFactors: Record<string, boolean>;
  safetyChecklist: Record<string, boolean>;
};

const defaultPatientForm: PatientForm = {
  bedNumber: '',
  initials: '',
  insertionDate: '',
  wardId: '',
  patientFactors: {
    agitation: false,
    extremesAgeWeightObesity: false,
    comorbidities: false,
    immuneNutrition: false
  },
  safetyChecklist: {
    capsClosed: true,
    glovesWorn: true,
    noAbnormalities: true,
    dressingIntact: true
  }
};

export default function PatientPage() {
  const router = useRouter();
  const { setPatientId, advanceTo, reset } = useWorkflow();
  const [form, setForm] = useState<PatientForm>(defaultPatientForm);
  const [status, setStatus] = useState<string>('');
  const [pending, setPending] = useState(false);

  const handleToggle = (group: 'patientFactors' | 'safetyChecklist', key: string) => {
    setForm((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: !prev[group][key]
      }
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setStatus('');
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        throw new Error('Could not save patient');
      }
      const data = await res.json();
      setPatientId(data.patient.id);
      advanceTo('consent');
      setStatus('Saved');
      router.push('/consent');
    } catch (error) {
      console.error(error);
      setStatus('Could not save, try again');
    } finally {
      setPending(false);
    }
  };

  return (
    <PageShell title="Patient Identification" subtitle="Bed + initials only">
      <form onSubmit={handleSubmit} className="space-y-4 pb-20">
        <div className="card">
          <label className="text-sm font-semibold text-slate-700" htmlFor="bedNumber">
            Bed Number
          </label>
          <input
            id="bedNumber"
            name="bedNumber"
            required
            value={form.bedNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, bedNumber: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="12B"
          />
          <label className="text-sm font-semibold text-slate-700" htmlFor="initials">
            Patient initials
          </label>
          <input
            id="initials"
            name="initials"
            required
            maxLength={3}
            value={form.initials}
            onChange={(e) => setForm((prev) => ({ ...prev, initials: e.target.value.toUpperCase() }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="AB"
          />
          <label className="text-sm font-semibold text-slate-700" htmlFor="insertionDate">
            Insertion date
          </label>
          <input
            id="insertionDate"
            type="date"
            required
            value={form.insertionDate}
            onChange={(e) => setForm((prev) => ({ ...prev, insertionDate: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
          <label className="text-sm font-semibold text-slate-700" htmlFor="wardId">
            Ward ID (optional)
          </label>
          <input
            id="wardId"
            value={form.wardId}
            onChange={(e) => setForm((prev) => ({ ...prev, wardId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="CVL-01"
          />
        </div>

        <section className="card">
          <p className="text-sm font-semibold">Patient factors</p>
          {Object.entries(form.patientFactors).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between text-sm text-slate-700">
              <span>{labelCopy[key]}</span>
              <input type="checkbox" checked={value} onChange={() => handleToggle('patientFactors', key)} className="h-5 w-5" />
            </label>
          ))}
        </section>

        <section className="card">
          <p className="text-sm font-semibold">Nursing safety checklist</p>
          {Object.entries(form.safetyChecklist).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between text-sm text-slate-700">
              <span>{labelCopy[key]}</span>
              <input type="checkbox" checked={value} onChange={() => handleToggle('safetyChecklist', key)} className="h-5 w-5" />
            </label>
          ))}
        </section>

        {status ? <p className="text-center text-sm text-slate-600">{status}</p> : null}

        <div className="fixed bottom-20 left-0 right-0 px-4">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-card p-3 space-y-2">
            <button type="submit" disabled={pending} className="w-full rounded-full bg-teal text-white py-3 font-semibold">
              Save &amp; Go to Consent
            </button>
            <button type="button" onClick={reset} className="w-full text-xs text-center text-slate-500">
              Reset workflow
            </button>
          </div>
        </div>
      </form>
    </PageShell>
  );
}

const labelCopy: Record<string, string> = {
  agitation: 'Agitation / delirium / self-pulling',
  extremesAgeWeightObesity: 'Extremes of age / obesity',
  comorbidities: 'Comorbidities (DM, CKD, malignancy, dialysis)',
  immuneNutrition: 'Immune / nutrition risk',
  capsClosed: 'Caps closed',
  glovesWorn: 'Gloves worn',
  noAbnormalities: 'No abnormalities',
  dressingIntact: 'Dressing intact'
};
