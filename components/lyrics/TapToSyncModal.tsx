'use client';

import React, { useState, useEffect } from 'react';
import { LyricLine } from '@/lib/types';
import { Clock, Play, Check, Download, RotateCcw, X } from 'lucide-react';

interface TapToSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimeMs: number;
  onApplyLyrics: (lines: LyricLine[]) => void;
}

export const TapToSyncModal: React.FC<TapToSyncModalProps> = ({
  isOpen,
  onClose,
  currentTimeMs,
  onApplyLyrics,
}) => {
  const [plainText, setPlainText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentSyncIndex, setCurrentSyncIndex] = useState(0);
  const [syncedLines, setSyncedLines] = useState<LyricLine[]>([]);
  const [parsedLines, setParsedLines] = useState<string[]>([]);

  // Split plain text into non-empty lines
  const handleStartSync = () => {
    const lines = plainText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    setParsedLines(lines);
    setCurrentSyncIndex(0);
    setSyncedLines([]);
    setIsSyncing(true);
  };

  // Stamp current line at current playback time
  const handleStampCurrentLine = () => {
    if (currentSyncIndex >= parsedLines.length) return;

    const newLine: LyricLine = {
      id: `sync-${currentSyncIndex}-${Date.now()}`,
      timeMs: currentTimeMs,
      text: parsedLines[currentSyncIndex],
      durationMs: 4000,
    };

    setSyncedLines((prev) => [...prev, newLine]);
    setCurrentSyncIndex((prev) => prev + 1);
  };

  // Keyboard Spacebar listener for stamping
  useEffect(() => {
    if (!isOpen || !isSyncing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleStampCurrentLine();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSyncing, currentSyncIndex, parsedLines, currentTimeMs]);

  // Apply custom synced lyrics to current session
  const handleApply = () => {
    if (syncedLines.length === 0) return;
    onApplyLyrics(syncedLines);
    onClose();
  };

  // Export .lrc file
  const handleExportLrc = () => {
    const lrcContent = syncedLines
      .map((line) => {
        const totalSec = line.timeMs / 1000;
        const mins = Math.floor(totalSec / 60);
        const secs = (totalSec % 60).toFixed(2);
        return `[${String(mins).padStart(2, '0')}:${secs.padStart(5, '0')}]${line.text}`;
      })
      .join('\n');

    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'synced_lyrics.lrc';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl studio-glass border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-white" />
            <h2 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-tight">
              Tap-to-Sync Lyric Calibration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-titanium-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {!isSyncing ? (
            <>
              <p className="text-xs text-titanium-400 leading-relaxed font-sans">
                Paste the song lyrics below line by line. Then click <strong>Start Syncing</strong> and tap the Spacebar along with the music to generate millisecond timestamps!
              </p>
              <textarea
                rows={10}
                placeholder="Line 1 of song lyrics&#10;Line 2 of song lyrics&#10;Line 3 of song lyrics..."
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                className="w-full p-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-titanium-500 focus:outline-none focus:border-white/20 font-sans resize-none"
              />
              <button
                onClick={handleStartSync}
                disabled={!plainText.trim()}
                className="w-full py-3 bg-white hover:bg-titanium-100 text-studio-950 font-bold rounded-xl text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Syncing With Music</span>
              </button>
            </>
          ) : (
            <div className="space-y-6 text-center">
              <div className="bg-black/50 p-5 rounded-2xl border border-white/10">
                <div className="text-xs text-titanium-400 font-mono mb-1">
                  CALIBRATING LINE {currentSyncIndex + 1} OF {parsedLines.length}
                </div>
                <div className="text-xl md:text-2xl font-bold text-white min-h-[60px] flex items-center justify-center">
                  {currentSyncIndex < parsedLines.length
                    ? parsedLines[currentSyncIndex]
                    : 'All lines calibrated!'}
                </div>
                {currentSyncIndex + 1 < parsedLines.length && (
                  <div className="text-xs text-titanium-500 mt-2 font-mono">
                    Next: {parsedLines[currentSyncIndex + 1]}
                  </div>
                )}
              </div>

              {/* Big Tap Button */}
              {currentSyncIndex < parsedLines.length ? (
                <button
                  onClick={handleStampCurrentLine}
                  className="w-full py-6 bg-studio-800 hover:bg-studio-700 active:scale-[0.98] border border-white/20 text-white font-mono font-bold text-base rounded-2xl shadow-xl transition-all select-none"
                >
                  TAP HERE (OR PRESS SPACEBAR)
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleApply}
                    className="flex-1 py-3 bg-signal-green text-studio-950 font-bold font-mono text-xs uppercase rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply to Stage</span>
                  </button>
                  <button
                    onClick={handleExportLrc}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-titanium-200 border border-white/10 font-bold font-mono text-xs uppercase rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Save .LRC</span>
                  </button>
                </div>
              )}

              {/* Reset Calibration */}
              <div className="pt-2">
                <button
                  onClick={() => setIsSyncing(false)}
                  className="text-xs text-titanium-500 hover:text-white flex items-center gap-1 mx-auto font-mono"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart Calibration</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
