import { NextRequest, NextResponse } from 'next/server';
import { fetchLyricsFromLRCLIB } from '@/lib/lyrics/lrclib';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackName = searchParams.get('track_name') || searchParams.get('q') || '';
  const artistName = searchParams.get('artist_name') || undefined;

  if (!trackName) {
    return NextResponse.json({ error: 'Missing track_name parameter' }, { status: 400 });
  }

  try {
    const result = await fetchLyricsFromLRCLIB({
      trackName,
      artistName,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching lyrics in API route:', error);
    return NextResponse.json({ error: 'Failed to fetch lyrics', syncedLyrics: [], found: false }, { status: 500 });
  }
}
