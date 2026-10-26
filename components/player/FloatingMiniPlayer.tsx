'use client';

import React from 'react';
import { SongMetadata } from '@/lib/types';
import { Play, Pause, Mic2, ArrowRight } from 'lucide-react';

interface FloatingMiniPlayerProps {
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTimeMs: number;
  durationMs: number;
  onOpenStage: () => void;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  currentTimeMs,
  durationMs,
  onOpenStage,
}) => {
  if (!currentSong) return null;

  const progressPercent = Math.min(100, Math.max(0, (currentTimeMs / Math.max(1, durationMs)) * 100));

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl bg-slate-900/95 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-3 text-white border border-white/10 relative overflow-hidden">
        
        {/* Track Thumbnail & Details */}
        <div
          onClick={onOpenStage}
          className="flex items-center gap-3 cursor-pointer group overflow-hidden"
        >
          {currentSong.coverUrl && (
            <img
              src={currentSong.coverUrl}
              alt={currentSong.title}
              className="w-11 h-11 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform"
            />
          )}
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
              {currentSong.title}
            </h4>
            <p className="text-[11px] text-slate-400 truncate">{currentSong.artist}</p>
          </div>
        </div>

        {/* Controls & Open Stage Button */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-xl bg-white text-slate-950 hover:bg-slate-100 flex items-center justify-center font-bold transition-all shadow-md active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Go to Stage Button */}
          <button
            onClick={onOpenStage}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Open Stage</span>
            <ArrowRight className="w-3 h-3 text-white/80" />
          </button>
        </div>

        {/* Thin bottom progress line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

      </div>
    </div>
  );
};
