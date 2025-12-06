import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const metrics = await db.wardMetrics.findMany({
    orderBy: { date: 'desc' },
    take: 30
  });
  if (!metrics.length) {
    return NextResponse.json({ metrics: [], delta: 0 });
  }
  const latest = metrics[0];
  const older = metrics[metrics.length - 1];
  const delta = older?.derivedRate
    ? ((latest.derivedRate - older.derivedRate) / older.derivedRate) * 100
    : 0;
  return NextResponse.json({ metrics, delta });
}
