"use client";

import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '@/components/PageShell';
import WorkflowGuard from '@/components/WorkflowGuard';
import { useWorkflow } from '@/context/WorkflowContext';

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

export default function CapturePage() {
  const router = useRouter();
  const { patientId, advanceTo } = useWorkflow();
  const [catheterFile, setCatheterFile] = useState<File | null>(null);
  const [tractionFile, setTractionFile] = useState<File | null>(null);
  const [tractionCounts, setTractionCounts] = useState({ yellow: 0, red: 0 });
  const [events, setEvents] = useState({ dressingChanged: false, catheterChanged: false, flushingDone: false });
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setTractionCounts((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!patientId || !catheterFile) {
      setStatus('Catheter-site image is required');
      return;
    }
    setPending(true);
    setStatus('');
    try {
      const catheterImageUrl = await readFile(catheterFile);
      const tractionImageUrl = tractionFile ? await readFile(tractionFile) : null;
      const response = await fetch('/api/captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          catheterImageUrl,
          tractionImageUrl,
          tractionCounts,
          events
        })
      });
      if (!response.ok) throw new Error('Failed to upload');
      advanceTo('dashboard');
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      setStatus('Could not save, try again');
    } finally {
      setPending(false);
    }
  };

  return (
    <WorkflowGuard requiredStage="capture">
      <PageShell title="12-Hourly Capture" subtitle="Images + traction log">
        <form className="space-y-4 pb-24" onSubmit={handleSubmit}>
          <section className="card">
            <label className="text-sm font-semibold">Catheter-site image</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              required
              onChange={(event) => setCatheterFile(event.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </section>

          <section className="card space-y-3">
            <label className="text-sm font-semibold">Traction device image (optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => setTractionFile(event.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {!tractionFile ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-sm text-slate-600">
                  Yellow pulls (12h)
                  <input
                    type="number"
                    name="yellow"
                    min={0}
                    value={tractionCounts.yellow}
                    onChange={handleNumberChange}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col text-sm text-slate-600">
                  Red pulls (12h)
                  <input
                    type="number"
                    name="red"
                    min={0}
                    value={tractionCounts.red}
                    onChange={handleNumberChange}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section className="card">
            <p className="text-sm font-semibold">Shift events</p>
            {Object.entries(events).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between text-sm text-slate-700">
                <span>{eventCopy[key as keyof typeof events]}</span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(event) =>
                    setEvents((prev) => ({ ...prev, [key]: event.target.checked }))
                  }
                  className="h-5 w-5"
                />
              </label>
            ))}
          </section>

          {status ? <p className="text-sm text-center text-risk-red">{status}</p> : null}

          <div className="fixed bottom-20 left-0 right-0 px-4">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-card p-3 space-y-2">
              <button type="submit" disabled={pending} className="w-full rounded-full bg-teal text-white py-3 font-semibold">
                Upload &amp; Go to Dashboard
              </button>
            </div>
          </div>
        </form>
      </PageShell>
    </WorkflowGuard>
  );
}

const eventCopy = {
  dressingChanged: 'Dressing changed this shift',
  catheterChanged: 'Catheter changed this shift',
  flushingDone: 'Flushing done this shift'
};
