'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause, FastForward, Rewind, Volume2, VolumeX } from 'lucide-react';

interface MusicPlayerBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTimeMs: number;
  durationMs: number;
  onSeek: (seconds: number) => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
}

export const MusicPlayerBar: React.FC<MusicPlayerBarProps> = ({
  isPlaying,
  onTogglePlay,
  currentTimeMs,
  durationMs,
  onSeek,
  volume,
  onChangeVolume,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValueSec, setScrubValueSec] = useState(0);
  const [hoverTimeSec, setHoverTimeSec] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentSec = currentTimeMs / 1000;
  const totalSec = Math.max(1, durationMs / 1000);
  const displaySec = isScrubbing ? scrubValueSec : currentSec;
  const remainingSec = Math.max(0, totalSec - displaySec);
  const progressPercent = Math.min(100, Math.max(0, (displaySec / totalSec) * 100));

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSkip = (deltaSeconds: number) => {
    const target = Math.max(0, Math.min(totalSec, currentSec + deltaSeconds));
    onSeek(target);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = ratio * totalSec;
    onSeek(targetSec);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, moveX / rect.width));
    setHoverTimeSec(ratio * totalSec);
    setHoverX(moveX);
  };

  const handleMouseLeave = () => {
    setHoverTimeSec(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-900/90 backdrop-blur-xl rounded-2xl p-3.5 shadow-2xl mb-4 select-none border border-white/10">
      
      {/* Precision Scrubber Bar */}
      <div className="relative group mb-3">
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden transition-all group-hover:h-2"
        >
          {/* Active Played Fill */}
          <div
            className="h-full bg-indigo-500 transition-all duration-75 relative rounded-full"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber Knob */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>

        {/* Hover Time Tooltip */}
        {hoverTimeSec !== null && (
          <div
            className="absolute -top-7 -translate-x-1/2 bg-slate-900 border border-white/20 px-2 py-0.5 rounded text-[11px] font-mono font-semibold text-white pointer-events-none shadow-lg"
            style={{ left: `${hoverX}px` }}
          >
            {formatTime(hoverTimeSec)}
          </div>
        )}
      </div>

      {/* Transport Controls Row */}
      <div className="flex items-center justify-between text-xs text-slate-300">
        
        {/* Left: Elapsed Time */}
        <div className="font-mono text-xs font-semibold min-w-[45px] text-left text-white">
          {formatTime(displaySec)}
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-3">
          {/* Rewind 10s */}
          <button
            onClick={() => handleSkip(-10)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-1"
            title="Rewind 10 seconds"
          >
            <Rewind className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">-10s</span>
          </button>

          {/* Master Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-950 flex items-center justify-center font-bold transition-all shadow-md active:scale-95"
            title={isPlaying ? 'Pause (Spacebar)' : 'Play (Spacebar)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Fast Forward 10s */}
          <button
            onClick={() => handleSkip(10)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-1"
            title="Forward 10 seconds"
          >
            <FastForward className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">+10s</span>
          </button>
        </div>

        {/* Right: Total Duration & Volume */}
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs font-semibold text-slate-300 min-w-[45px] text-right" title="Total Track Duration">
            {formatTime(totalSec)}
          </div>

          {/* Volume Slider with Mute */}
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-white/10">
            <button
              onClick={() => onChangeVolume(volume > 0 ? 0 : 1)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-16 h-1 cursor-pointer accent-indigo-500"
              title={`Music Volume: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>

      </div>

    </div>
  );
};
