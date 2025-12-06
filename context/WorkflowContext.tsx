"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type WorkflowStage =
  | 'patient'
  | 'consent'
  | 'capture'
  | 'dashboard'
  | 'alerts'
  | 'ward'
  | 'resource';

type WorkflowContextValue = {
  patientId?: string;
  stage: WorkflowStage;
  setPatientId: (id?: string) => void;
  advanceTo: (stage: WorkflowStage) => void;
  reset: () => void;
};

const STORAGE_KEY = 'cathshield-workflow-v1';
const order: WorkflowStage[] = ['patient', 'consent', 'capture', 'dashboard', 'alerts', 'ward', 'resource'];

const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const [stage, setStage] = useState<WorkflowStage>('patient');
  const [patientId, setPatientId] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted) as { stage: WorkflowStage; patientId?: string };
        setStage(parsed.stage);
        setPatientId(parsed.patientId);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage, patientId }));
  }, [stage, patientId]);

  const value = useMemo<WorkflowContextValue>(() => ({
    patientId,
    stage,
    setPatientId: (id?: string) => setPatientId(id),
    advanceTo: (next: WorkflowStage) => {
      const currentIndex = order.indexOf(stage);
      const nextIndex = order.indexOf(next);
      if (nextIndex >= currentIndex) {
        setStage(next);
      }
    },
    reset: () => {
      setStage('patient');
      setPatientId(undefined);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }), [patientId, stage]);

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};

export const useWorkflow = () => {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error('useWorkflow must be used inside WorkflowProvider');
  }
  return ctx;
};

export const canAccessStage = (current: WorkflowStage, required: WorkflowStage) => {
  const currentIndex = order.indexOf(current);
  const requiredIndex = order.indexOf(required);
  return currentIndex >= requiredIndex;
};
