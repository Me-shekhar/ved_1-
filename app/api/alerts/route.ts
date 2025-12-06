import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  const unacknowledged = searchParams.get('unacknowledged') === 'true';
  const alerts = await db.alert.findMany({
    where: {
      patientId: patientId || undefined,
      acknowledged: unacknowledged ? false : undefined
    },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ alerts });
}
