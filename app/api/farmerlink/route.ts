import { NextResponse } from 'next/server';
import { getCounts } from '@/lib/farmerlink';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  if (!process.env.FARMERLINK_EMAIL || !process.env.FARMERLINK_PASSWORD) {
    return NextResponse.json({
      connected: false,
      reason: 'Add FARMERLINK_EMAIL and FARMERLINK_PASSWORD to .env to enable live data.',
    });
  }
  try {
    const counts = await getCounts();
    return NextResponse.json({ connected: true, counts, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { connected: false, reason: e instanceof Error ? e.message : 'FarmerLink login failed.' },
      { status: 502 },
    );
  }
}
