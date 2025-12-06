import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import FooterNote from '@/components/FooterNote';
import { WorkflowProvider } from '@/context/WorkflowContext';

export const metadata: Metadata = {
  title: 'CathShield.ai Mobile Suite',
  description: 'Hospital-grade, mobile-first catheter safety workflow'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-slate-50 text-slate-900">
        <WorkflowProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1 pb-24">{children}</main>
            <FooterNote />
            <BottomNav />
          </div>
        </WorkflowProvider>
      </body>
    </html>
  );
}
