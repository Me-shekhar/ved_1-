import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(_: Request, { params }: { params: { id: string } }) {
  const alert = await db.alert.update({
    where: { id: params.id },
    data: { acknowledged: true }
  });
  return NextResponse.json({ alert });
}
