"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { canAccessStage, useWorkflow, type WorkflowStage } from '@/context/WorkflowContext';

type Props = {
  requiredStage: WorkflowStage;
  children: React.ReactNode;
  fallbackPath?: string;
};

export default function WorkflowGuard({ requiredStage, children, fallbackPath = '/patient' }: Props) {
  const router = useRouter();
  const { stage } = useWorkflow();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const ok = canAccessStage(stage, requiredStage);
    setAllowed(ok);
    if (!ok) {
      router.replace(fallbackPath);
    }
  }, [stage, requiredStage, router, fallbackPath]);

  if (!allowed) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-10 text-center space-y-3">
        <p className="text-base font-semibold text-slate-800">Please complete the previous workflow step.</p>
      </div>
    );
  }

  return <>{children}</>;
}
