import Link from 'next/link';
import PrivacyBanner from '@/components/PrivacyBanner';
import PageShell from '@/components/PageShell';

export default function HomePage() {
  return (
    <PageShell title="CathShield.ai" subtitle="Clinical Line Surveillance">
      <div className="card">
        <p className="text-sm text-slate-600">Hospital-grade, mobile-first workflow for catheter safety.</p>
        <PrivacyBanner />
        <div className="space-y-2">
          <Link href="/patient" className="block w-full rounded-full bg-teal text-white text-center py-3 font-semibold">
            Begin Patient Identification
          </Link>
          <p className="text-xs text-slate-500 text-center">Workflow: Patient ID → Consent → 12-hour capture → Dashboard → Alerts → Ward Analytics → Resource module</p>
        </div>
      </div>
    </PageShell>
  );
}
