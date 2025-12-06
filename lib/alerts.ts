import type { AlertSeverity, AlertType, RiskBand } from '@prisma/client';

export type AlertCandidate = {
  type: AlertType;
  reason: string;
  severity: AlertSeverity;
  recommendedAction: string;
};

export const buildRiskAlerts = (params: {
  predictiveClabsiBand: RiskBand;
  predictiveVenousResistanceBand: RiskBand;
  tractionPullsRed: number;
  tractionPullsYellow: number;
  dressingFailure: boolean;
}) => {
  const alerts: AlertCandidate[] = [];
  if (params.predictiveClabsiBand !== 'green') {
    alerts.push({
      type: 'high_clabsi',
      reason: `Predictive CLABSI risk is ${params.predictiveClabsiBand.toUpperCase()}`,
      severity: params.predictiveClabsiBand === 'red' ? 'critical' : 'warning',
      recommendedAction:
        params.predictiveClabsiBand === 'red'
          ? 'Urgent clinician review and blood cultures'
          : 'Increase surveillance and reinforce dressing'
    });
  }
  if (params.predictiveVenousResistanceBand !== 'green') {
    alerts.push({
      type: 'high_venous_resistance',
      reason: `Predictive venous resistance band is ${params.predictiveVenousResistanceBand.toUpperCase()}`,
      severity: params.predictiveVenousResistanceBand === 'red' ? 'critical' : 'warning',
      recommendedAction: 'Assess line patency and evaluate for thrombosis'
    });
  }
  if (params.tractionPullsRed >= 2) {
    alerts.push({
      type: 'traction',
      reason: '>= 2 red traction pulls in the last cycle',
      severity: 'critical',
      recommendedAction: 'Secure line, escalate to MO, consider sedation strategy'
    });
  }
  if (params.dressingFailure) {
    alerts.push({
      type: 'dressing_failure',
      reason: 'Image analysis flagged a dressing failure',
      severity: 'warning',
      recommendedAction: 'Replace dressing with sterile CHG dressing'
    });
  }
  return alerts;
};

export const buildResourceAlert = (combinedRate: number): AlertCandidate | null => {
  if (combinedRate <= 30) return null;
  const severity: AlertSeverity = combinedRate > 60 ? 'critical' : 'warning';
  return {
    type: 'resource_shortage',
    reason: `Resource deprivation at ${combinedRate.toFixed(1)}%`,
    severity,
    recommendedAction: 'Notify admin and escalate procurement immediately'
  };
};
