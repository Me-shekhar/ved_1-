import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildRiskAlerts } from '@/lib/alerts';
import { calculateRiskSnapshot, type PatientFactorFlags, type SafetyChecklist } from '@/lib/riskEngine';

export async function POST(request: Request) {
  const body = await request.json();
  const patient = await db.patient.findUnique({ where: { id: body.patientId } });
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const catheterCapture = await db.imageCapture.create({
    data: {
      patientId: patient.id,
      imageType: 'catheter_site',
      imageUrl: body.catheterImageUrl,
      captureStatus: 'success'
    }
  });

  let tractionCapture = null;
  if (body.tractionImageUrl) {
    tractionCapture = await db.imageCapture.create({
      data: {
        patientId: patient.id,
        imageType: 'traction_module',
        imageUrl: body.tractionImageUrl,
        captureStatus: 'success'
      }
    });
  }

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 12 * 60 * 60 * 1000);

  const shiftEvents = await db.shiftEvents.create({
    data: {
      patientId: patient.id,
      periodStart,
      periodEnd,
      tractionPullsYellow: body.tractionCounts?.yellow ?? 0,
      tractionPullsRed: body.tractionCounts?.red ?? 0,
      dressingChanged: Boolean(body.events?.dressingChanged),
      catheterChanged: Boolean(body.events?.catheterChanged),
      flushingDone: Boolean(body.events?.flushingDone)
    }
  });

  const patientFactors = patient.patientFactors as unknown as PatientFactorFlags;
  const safetyChecklist = patient.safetyChecklist as unknown as SafetyChecklist;

  const computation = calculateRiskSnapshot({
    insertionDate: patient.insertionDate,
    patientFactors,
    safetyChecklist,
    tractionPullsYellow: shiftEvents.tractionPullsYellow,
    tractionPullsRed: shiftEvents.tractionPullsRed,
    dressingChanged: shiftEvents.dressingChanged,
    catheterChanged: shiftEvents.catheterChanged,
    flushingDone: shiftEvents.flushingDone
  });

  const riskSnapshot = await db.riskSnapshot.create({
    data: {
      patientId: patient.id,
      clisaScore: computation.clisaScore,
      predictiveClabsiScore: computation.predictiveClabsiScore,
      predictiveClabsiBand: computation.predictiveClabsiBand,
      predictiveVenousResistanceBand: computation.predictiveVenousResistanceBand,
      recommendedAction: computation.recommendedAction,
      tractionPullsYellow: computation.tractionPullsYellow,
      tractionPullsRed: computation.tractionPullsRed
    }
  });

  const alerts = buildRiskAlerts({
    predictiveClabsiBand: computation.predictiveClabsiBand,
    predictiveVenousResistanceBand: computation.predictiveVenousResistanceBand,
    tractionPullsRed: computation.tractionPullsRed,
    tractionPullsYellow: computation.tractionPullsYellow,
    dressingFailure: !safetyChecklist?.dressingIntact
  });

  if (alerts.length) {
    await db.$transaction(
      alerts.map((alert) =>
        db.alert.create({
          data: {
            patientId: patient.id,
            type: alert.type,
            reason: alert.reason,
            severity: alert.severity,
            recommendedAction: alert.recommendedAction
          }
        })
      )
    );
  }

  return NextResponse.json({ catheterCapture, tractionCapture, riskSnapshot });
}
