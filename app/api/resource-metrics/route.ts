import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildResourceAlert } from '@/lib/alerts';

export async function POST(request: Request) {
  const body = await request.json();
  const patients = Number(body.patients);
  const dressings = Number(body.dressings);
  const catheters = Number(body.catheters);
  const wardId = body.wardId || 'WARD-1';

  if (!patients || patients <= 0) {
    return NextResponse.json({ error: 'Patients count is required' }, { status: 400 });
  }

  const ddr = patients > dressings ? ((patients - dressings) / patients) * 100 : 0;
  const cdr = patients > catheters ? ((patients - catheters) / patients) * 100 : 0;
  const combined = (ddr + cdr) / 2;
  const band = combined <= 10 ? 'green' : combined <= 60 ? 'yellow' : 'red';

  const metric = await db.resourceMetric.create({
    data: {
      wardId,
      patientsNeeding: patients,
      availableDressings: dressings,
      availableCatheters: catheters,
      dressingsDeficitRate: Number(ddr.toFixed(2)),
      cathetersDeficitRate: Number(cdr.toFixed(2)),
      combinedRate: Number(combined.toFixed(2)),
      band
    }
  });

  const resourceAlert = buildResourceAlert(combined);
  if (resourceAlert) {
    await db.alert.create({
      data: {
        patientId: null,
        type: resourceAlert.type,
        reason: resourceAlert.reason,
        severity: resourceAlert.severity,
        recommendedAction: resourceAlert.recommendedAction
      }
    });
  }

  return NextResponse.json({ metric: { ...metric, alert: Boolean(resourceAlert) } });
}
