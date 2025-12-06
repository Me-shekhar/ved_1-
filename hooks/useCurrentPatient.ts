"use client";

import { useEffect, useState } from 'react';
import { useWorkflow } from '@/context/WorkflowContext';

export default function useCurrentPatient() {
  const { patientId } = useWorkflow();
  const [id, setId] = useState<string | undefined>(patientId);

  useEffect(() => {
    setId(patientId);
  }, [patientId]);

  return id;
}
