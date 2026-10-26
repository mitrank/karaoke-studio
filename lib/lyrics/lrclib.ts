import { LyricLine, LRCLibSearchResult } from '../types';

export function parseLrc(lrcContent: string): LyricLine[] {
  if (!lrcContent) return [];
  const lines = lrcContent.split('\n');
  const result: LyricLine[] = [];

  // Regex to match [mm:ss.xx] or [mm:ss.xxx] or [mm:ss]
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    timeRegex.lastIndex = 0;
    const match = timeRegex.exec(rawLine);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const msFraction = match[3] || '0';
    const milliseconds = msFraction.length === 2 ? parseInt(msFraction, 10) * 10 : parseInt(msFraction.padEnd(3, '0').slice(0, 3), 10);

    const totalMs = (minutes * 60 + seconds) * 1000 + milliseconds;
    // Strip timestamps and any word-sync brackets
    const cleanText = rawLine.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').replace(/<\d{2}:\d{2}(?:\.\d{2,3})?>/g, '').trim();

    if (cleanText) {
      result.push({
        id: `line-${i}-${totalMs}`,
        timeMs: totalMs,
        text: cleanText,
      });
    }
  }

  // Sort by timeMs ascending
  result.sort((a, b) => a.timeMs - b.timeMs);

  // Compute duration for each line (time until next line, capped at 8s)
  for (let i = 0; i < result.length; i++) {
    if (i < result.length - 1) {
      const nextTime = result[i + 1].timeMs;
      result[i].durationMs = Math.min(nextTime - result[i].timeMs, 8000);
    } else {
      result[i].durationMs = 5000;
    }
  }

  return result;
}

export async function fetchLyricsFromLRCLIB(query: {
  trackName: string;
  artistName?: string;
  duration?: number;
}): Promise<{
  syncedLyrics: LyricLine[];
  plainLyrics?: string;
  found: boolean;
}> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set('track_name', query.trackName);
    if (query.artistName) {
      searchParams.set('artist_name', query.artistName);
    }

    const res = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
      headers: {
        'User-Agent': 'KaraokeStudioApp/1.0 (https://github.com/karaoke)',
      },
    });

    if (!res.ok) {
      // Try fallback broad search
      const broadRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query.trackName + (query.artistName ? ' ' + query.artistName : ''))}`);
      if (!broadRes.ok) return { syncedLyrics: [], found: false };
      const items: LRCLibSearchResult[] = await broadRes.json();
      return processLRCLibItems(items, query.duration);
    }

    const items: LRCLibSearchResult[] = await res.json();
    return processLRCLibItems(items, query.duration);
  } catch (err) {
    console.error('LRCLIB fetch error:', err);
    return { syncedLyrics: [], found: false };
  }
}

function processLRCLibItems(items: LRCLibSearchResult[], targetDuration?: number) {
  if (!items || items.length === 0) {
    return { syncedLyrics: [], found: false };
  }

  // Prioritize items that have syncedLyrics
  let best = items.find(item => !!item.syncedLyrics);
  if (!best) {
    best = items[0];
  }

  if (best?.syncedLyrics) {
    return {
      syncedLyrics: parseLrc(best.syncedLyrics),
      plainLyrics: best.plainLyrics || undefined,
      found: true,
    };
  }

  return {
    syncedLyrics: [],
    plainLyrics: best?.plainLyrics || undefined,
    found: !!best?.plainLyrics,
  };
}
