'use client';

import React, { useEffect, useRef } from 'react';
import { LyricLine } from '@/lib/types';
import { transliterateIndicToRoman, isIndicScript } from '@/lib/lyrics/transliteration';
import { Languages, RotateCcw, Music, Sparkles } from 'lucide-react';

interface KaraokeLyricsViewProps {
  lyrics: LyricLine[];
  currentTimeMs: number;
  syncOffsetMs: number;
  onAdjustSyncOffset: (deltaMs: number) => void;
  onResetSyncOffset: () => void;
  onSeek: (timeMs: number) => void;
  showTransliteration: boolean;
  onToggleTransliteration: () => void;
  isStageFullscreen?: boolean;
}

export const KaraokeLyricsView: React.FC<KaraokeLyricsViewProps> = ({
  lyrics,
  currentTimeMs,
  syncOffsetMs,
  onAdjustSyncOffset,
  onResetSyncOffset,
  onSeek,
  showTransliteration,
  onToggleTransliteration,
  isStageFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Apply real-time calibration sync offset
  const calibratedTimeMs = currentTimeMs + syncOffsetMs;

  // Find index of current active line
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    const duration = line.durationMs || 5000;
    if (calibratedTimeMs >= line.timeMs && calibratedTimeMs < line.timeMs + duration) {
      activeIndex = i;
      break;
    } else if (calibratedTimeMs >= line.timeMs) {
      activeIndex = i;
    }
  }

  // Check if we are in the intro before the first line
  const firstLineTimeMs = lyrics.length > 0 ? lyrics[0].timeMs : 0;
  const isIntro = calibratedTimeMs < firstLineTimeMs && lyrics.length > 0;
  const introRemainingSec = Math.max(0, Math.ceil((firstLineTimeMs - calibratedTimeMs) / 1000));

  // Calculate Lead-In dots (if there is an upcoming line and we are within 3.5s before it)
  const nextLineIndex = activeIndex + 1;
  const nextLine = nextLineIndex < lyrics.length ? lyrics[nextLineIndex] : null;
  let leadInDots = 0;
  if (nextLine) {
    const timeUntilNext = nextLine.timeMs - calibratedTimeMs;
    if (timeUntilNext > 0 && timeUntilNext <= 3500) {
      leadInDots = Math.ceil((timeUntilNext / 3500) * 4);
    }
  }

  // Smooth scroll container to center the active line
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      if (activeLineRef.current) {
        const activeEl = activeLineRef.current;
        const offsetTop = activeEl.offsetTop - container.offsetTop;
        const targetScroll = offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth',
        });
      } else if (isIntro) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [activeIndex, isIntro]);

  const hasIndic = lyrics.some((l) => isIndicScript(l.text));

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-slate-400 p-8 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white shadow-lg">
          <Music className="w-7 h-7 text-indigo-400" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          No Synchronized Lyrics Loaded
        </h3>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Open the <strong>Sync Editor</strong> above to create timestamps in under a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full flex-1 flex flex-col items-center">
      
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Stage Utility Header: Calibration & Language */}
      <div className="w-full max-w-3xl flex items-center justify-center sm:justify-between px-2 sm:px-4 py-1.5 sm:py-2 z-20 flex-wrap gap-2 text-xs mb-2">
        
        {/* Sync Calibration Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 rounded-full border border-white/10 text-xs shadow-lg">
          <span className="text-slate-400 font-medium hidden sm:inline mr-1 text-[11px] uppercase tracking-wider">
            Sync Timing:
          </span>
          <button
            onClick={() => onAdjustSyncOffset(-500)}
            className="px-1.5 sm:px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all text-[10px] sm:text-[11px] font-semibold"
            title="Advance lyrics 0.5s earlier"
          >
            -0.5s
          </button>
          <button
            onClick={() => onAdjustSyncOffset(-100)}
            className="px-1.5 sm:px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all text-[10px] sm:text-[11px] font-semibold"
            title="Advance lyrics 0.1s earlier"
          >
            -0.1s
          </button>
          
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold text-center min-w-[48px] sm:min-w-[55px] text-[11px] sm:text-xs ${
              syncOffsetMs !== 0 ? 'text-amber-300 bg-amber-500/15' : 'text-white'
            }`}
          >
            {syncOffsetMs > 0 ? `+${(syncOffsetMs / 1000).toFixed(1)}s` : `${(syncOffsetMs / 1000).toFixed(1)}s`}
          </span>

          <button
            onClick={() => onAdjustSyncOffset(100)}
            className="px-1.5 sm:px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all text-[10px] sm:text-[11px] font-semibold"
            title="Delay lyrics 0.1s later"
          >
            +0.1s
          </button>
          <button
            onClick={() => onAdjustSyncOffset(500)}
            className="px-1.5 sm:px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all text-[10px] sm:text-[11px] font-semibold"
            title="Delay lyrics 0.5s later"
          >
            +0.5s
          </button>

          {syncOffsetMs !== 0 && (
            <button
              onClick={onResetSyncOffset}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all ml-0.5 sm:ml-1"
              title="Reset offset to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Phonetic Romanized Script Toggle */}
        {hasIndic && (
          <button
            onClick={onToggleTransliteration}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all ${
              showTransliteration
                ? 'bg-indigo-600/30 border-indigo-400/50 text-indigo-200 shadow-sm'
                : 'bg-slate-900/90 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Switch between Original Script and English Phonetics"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-300" />
            <span>{showTransliteration ? 'Phonetic English: ON' : 'Original Script'}</span>
          </button>
        )}

      </div>

      {/* Instrumental Intro Alert Banner */}
      {isIntro && (
        <div className="mb-3 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-2 animate-pulse shadow-lg text-center">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Instrumental Intro — Vocals in {introRemainingSec}s</span>
        </div>
      )}

      {/* Fluid Lyrics Viewport with Explicit Scrollable Height */}
      <div
        ref={containerRef}
        className={`w-full h-[52vh] sm:h-[55vh] md:h-[58vh] max-h-[580px] overflow-y-auto px-2 sm:px-4 py-8 sm:py-12 space-y-5 sm:space-y-7 scroll-smooth select-none hide-scrollbar text-center ${
          isStageFullscreen ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        {lyrics.map((line, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;
          const isNext = idx === activeIndex + 1;

          // Progress across the active line
          let progressPercent = 0;
          if (isActive) {
            const elapsedInLine = calibratedTimeMs - line.timeMs;
            const duration = line.durationMs || 4000;
            progressPercent = Math.min(100, Math.max(0, (elapsedInLine / duration) * 100));
          } else if (isPast) {
            progressPercent = 100;
          }

          const displayPrimary = showTransliteration
            ? transliterateIndicToRoman(line.text)
            : line.text;
          const displaySecondary = showTransliteration && isIndicScript(line.text)
            ? line.text
            : null;

          return (
            <div
              key={line.id}
              ref={isActive ? activeLineRef : null}
              onClick={() => onSeek(line.timeMs)}
              className={`cursor-pointer transition-all duration-300 transform group relative ${
                isActive
                  ? 'scale-[1.04] md:scale-[1.08] my-6 py-3 px-6 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 shadow-xl shadow-indigo-600/15'
                  : isPast
                  ? 'opacity-40 hover:opacity-75 scale-[0.98] py-1'
                  : isNext
                  ? 'opacity-85 hover:opacity-100 scale-[1.01] py-1.5'
                  : 'opacity-55 hover:opacity-85 scale-[0.98] py-1'
              }`}
            >
              {/* Vocal Lead-In Countdown Dots */}
              {isNext && leadInDots > 0 && (
                <div className="flex items-center justify-center gap-1.5 mb-2 transition-all">
                  {Array.from({ length: 4 }).map((_, dotIdx) => (
                    <span
                      key={dotIdx}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                        dotIdx < leadInDots
                          ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)] scale-125'
                          : 'bg-white/20 scale-90'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Primary Lyric Text */}
              <div
                className={`relative inline-block font-extrabold tracking-tight leading-relaxed ${
                  isStageFullscreen
                    ? 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl'
                    : isActive
                    ? 'text-xl sm:text-3xl md:text-4xl'
                    : isNext
                    ? 'text-base sm:text-2xl md:text-3xl'
                    : 'text-sm sm:text-xl md:text-2xl'
                }`}
              >
                {/* Background base text */}
                <span
                  className={`transition-colors duration-200 ${
                    isActive
                      ? 'text-slate-300'
                      : isNext
                      ? 'text-slate-200'
                      : 'text-slate-400'
                  }`}
                >
                  {displayPrimary}
                </span>

                {/* Active fluid highlight fill */}
                {isActive && (
                  <span
                    className="absolute inset-0 text-white transition-all pointer-events-none drop-shadow-[0_2px_18px_rgba(255,255,255,0.6)]"
                    style={{
                      clipPath: `polygon(0 0, ${progressPercent}% 0, ${progressPercent}% 100%, 0 100%)`,
                    }}
                  >
                    {displayPrimary}
                  </span>
                )}
              </div>

              {/* Secondary Subtitle if transliterated */}
              {displaySecondary && (
                <div
                  className={`text-xs sm:text-sm mt-1 transition-opacity ${
                    isActive ? 'text-indigo-300 font-semibold' : 'text-slate-400 opacity-70'
                  }`}
                >
                  {displaySecondary}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
