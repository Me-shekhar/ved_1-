import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const patient = await db.patient.findUnique({
    where: { id: params.id }
  });
  if (!patient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ patient });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const patient = await db.patient.update({
    where: { id: params.id },
    data: body
  });
  return NextResponse.json({ patient });
}
