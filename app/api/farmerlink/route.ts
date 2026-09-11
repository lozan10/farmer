import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const endpoint = process.env.FARMERLINK_API_URL;
  const token = process.env.FARMERLINK_API_TOKEN;

  if (!endpoint || !token) {
    return NextResponse.json({
      connected: false,
      reason: 'FarmerLink connector is ready but not configured.',
      required: ['FARMERLINK_API_URL', 'FARMERLINK_API_TOKEN'],
    });
  }

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json(
        { connected: false, reason: `FarmerLink returned ${response.status}.` },
        { status: 502 },
      );
    }
    return NextResponse.json({ connected: true, data: await response.json() });
  } catch {
    return NextResponse.json(
      { connected: false, reason: 'FarmerLink could not be reached.' },
      { status: 502 },
    );
  }
}
