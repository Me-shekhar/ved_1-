import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const patients = await db.patient.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  return NextResponse.json({ patients });
}

export async function POST(request: Request) {
  const body = await request.json();
  const patient = await db.patient.create({
    data: {
      bedNumber: body.bedNumber,
      initials: body.initials,
      insertionDate: new Date(body.insertionDate),
      wardId: body.wardId || null,
      patientFactors: body.patientFactors,
      safetyChecklist: body.safetyChecklist
    }
  });
  return NextResponse.json({ patient });
}
