import { differenceInDays, format } from 'date-fns';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  if (!patientId) {
    return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
  }
  const patient = await db.patient.findUnique({
    where: { id: patientId },
    include: {
      riskSnapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
      imageCaptures: { where: { imageType: 'catheter_site' }, orderBy: { timestamp: 'desc' }, take: 1 }
    }
  });
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const riskSnapshot = patient.riskSnapshots[0] ?? null;
  const latestCapture = patient.imageCaptures[0] ?? null;
  const trend = await db.riskSnapshot.findMany({
    where: { patientId },
    orderBy: { capturedAt: 'asc' },
    take: 10
  });

  return NextResponse.json({
    patient: {
      id: patient.id,
      bedNumber: patient.bedNumber,
      initials: patient.initials,
      insertionDate: format(patient.insertionDate, 'yyyy-MM-dd'),
      daysSinceInsertion: differenceInDays(new Date(), patient.insertionDate)
    },
    riskSnapshot,
    latestCapture,
    trend: trend.map((entry) => ({
      timestamp: entry.capturedAt.toISOString(),
      score: entry.predictiveClabsiScore,
      band: entry.predictiveClabsiBand,
      dressingChange: false,
      catheterChange: false,
      flushing: false
    }))
  });
}
