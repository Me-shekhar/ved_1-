import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const body = await request.json();
  const consent = await db.consent.create({
    data: {
      patientId: body.patientId,
      audioLanguageUsed: body.audioLanguageUsed ?? 'English',
      audioPlayed: true,
      playbackFinishedAt: new Date()
    }
  });
  return NextResponse.json({ consent });
}
