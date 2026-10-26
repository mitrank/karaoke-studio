import { NextRequest, NextResponse } from 'next/server';
import yts from 'yt-search';
import { fetchLyricsFromLRCLIB, parseLrc } from '@/lib/lyrics/lrclib';
import { SongMetadata, LyricLine } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';

  if (!query.trim()) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    // 1. Run parallel queries for karaoke, original audio, and synchronized lyrics
    const [karaokeYtRes, originalYtRes, lyricsRes] = await Promise.allSettled([
      yts(`${query} karaoke instrumental`),
      yts(`${query} official audio song`),
      fetchLyricsFromLRCLIB({ trackName: query }),
    ]);

    const karaokeVideos = karaokeYtRes.status === 'fulfilled' ? karaokeYtRes.value.videos : [];
    const originalVideos = originalYtRes.status === 'fulfilled' ? originalYtRes.value.videos : [];

    // 2. Select the best original track
    let bestOriginal = originalVideos.length > 0 ? originalVideos[0] : null;

    // 3. Smart Duration Matching:
    // If the original song is full length (e.g. 4 minutes), pick the karaoke video
    // that matches the original song's duration, rather than short 2-minute teasers/samples.
    let bestKaraoke = karaokeVideos.length > 0 ? karaokeVideos[0] : null;
    if (bestOriginal && bestOriginal.seconds > 60 && karaokeVideos.length > 1) {
      // Sort karaoke videos by closest duration to the original track
      const sortedKaraoke = [...karaokeVideos].sort((a, b) => {
        const diffA = Math.abs(a.seconds - bestOriginal.seconds);
        const diffB = Math.abs(b.seconds - bestOriginal.seconds);
        return diffA - diffB;
      });
      bestKaraoke = sortedKaraoke[0];
    }

    // 4. Process Synchronized Lyrics
    let syncedLyrics: LyricLine[] = [];
    let hasSynced = false;
    let plainLyrics = '';

    if (lyricsRes.status === 'fulfilled' && lyricsRes.value.found) {
      syncedLyrics = lyricsRes.value.syncedLyrics;
      hasSynced = syncedLyrics.length > 0;
      plainLyrics = lyricsRes.value.plainLyrics || '';
    }

    if (!bestKaraoke && !bestOriginal) {
      return NextResponse.json({ error: 'No songs found on YouTube', results: [] });
    }

    // Primary video choice
    const primaryVideo = bestKaraoke || bestOriginal!;
    const karaokeId = bestKaraoke ? bestKaraoke.videoId : bestOriginal!.videoId;
    const originalId = bestOriginal ? bestOriginal.videoId : karaokeId;

    const matchedSong: SongMetadata = {
      id: `online-${primaryVideo.videoId}`,
      title: cleanTitle(primaryVideo.title, query),
      artist: primaryVideo.author?.name || 'Artist',
      durationSeconds: primaryVideo.seconds || (bestOriginal?.seconds || 240),
      karaokeYoutubeId: karaokeId,
      originalYoutubeId: originalId,
      activeTrackMode: bestKaraoke ? 'karaoke' : 'original',
      hasSyncedLyrics: hasSynced,
      lyrics: syncedLyrics,
      plainLyrics: plainLyrics,
      sourceType: 'youtube',
      coverUrl: primaryVideo.thumbnail || `https://img.youtube.com/vi/${karaokeId}/hqdefault.jpg`,
      defaultSyncOffsetMs: 0,
    };

    // Also build list of alternative options
    const alternatives: SongMetadata[] = karaokeVideos.slice(0, 5).map((v) => ({
      id: `online-${v.videoId}`,
      title: cleanTitle(v.title, query),
      artist: v.author?.name || 'Artist',
      durationSeconds: v.seconds || 0,
      karaokeYoutubeId: v.videoId,
      originalYoutubeId: bestOriginal?.videoId || v.videoId,
      activeTrackMode: 'karaoke',
      hasSyncedLyrics: hasSynced,
      lyrics: syncedLyrics,
      plainLyrics: plainLyrics,
      sourceType: 'youtube',
      coverUrl: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
    }));

    return NextResponse.json({
      primary: matchedSong,
      results: alternatives.length > 0 ? alternatives : [matchedSong],
    });
  } catch (error) {
    console.error('Unified song search error:', error);
    return NextResponse.json({ error: 'Search failed', results: [] }, { status: 500 });
  }
}

function cleanTitle(title: string, originalQuery: string): string {
  if (!title) return originalQuery;
  return title
    .replace(/\s*\(?(?:karaoke|instrumental|with lyrics|official video|official audio|full song)\)?/gi, '')
    .trim();
}
