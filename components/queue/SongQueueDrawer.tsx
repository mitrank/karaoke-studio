'use client';

import React from 'react';
import { SongMetadata } from '@/lib/types';
import {
  ListMusic,
  X,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Music,
  Sparkles,
  Disc,
} from 'lucide-react';

interface SongQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: SongMetadata[];
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  onPlaySongNow: (song: SongMetadata, queueIndex?: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onClearQueue: () => void;
  onOpenSearch: () => void;
}

export const SongQueueDrawer: React.FC<SongQueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentSong,
  isPlaying,
  onPlaySongNow,
  onRemoveFromQueue,
  onMoveQueueItem,
  onClearQueue,
  onOpenSearch,
}) => {
  if (!isOpen) return null;

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md h-full bg-[#0d1017] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Song Queue</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {queue.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">Up Next & Live Party Playlist</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            title="Close Queue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Section 1: Now Playing Card */}
          {currentSong && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 animate-spin-slow" />
                Now Performing
              </span>
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentSong.coverUrl ? (
                    <img
                      src={currentSong.coverUrl}
                      alt={currentSong.title}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-indigo-400" />
                    </div>
                  )}
                  <div className="truncate">
                    <h4 className="text-sm font-bold text-white truncate">{currentSong.title}</h4>
                    <p className="text-xs text-slate-400 truncate">{currentSong.artist}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-indigo-300 font-mono">
                      <span>{formatDuration(currentSong.durationSeconds)}</span>
                      {currentSong.musicalKey && <span>• {currentSong.musicalKey}</span>}
                    </div>
                  </div>
                </div>

                {/* Animated Equalizer Bars */}
                {isPlaying && (
                  <div className="flex items-end gap-0.5 h-4 shrink-0 pr-2">
                    <span className="w-1 bg-indigo-400 rounded-full animate-bounce h-3" />
                    <span className="w-1 bg-indigo-400 rounded-full animate-bounce h-4 delay-75" />
                    <span className="w-1 bg-indigo-400 rounded-full animate-bounce h-2 delay-150" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Up Next Queue List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Up Next ({queue.length})
              </span>
              {queue.length > 0 && (
                <button
                  onClick={onClearQueue}
                  className="text-xs text-rose-400/80 hover:text-rose-300 transition-colors"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {queue.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                  <ListMusic className="w-6 h-6 text-slate-500" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Queue is Empty</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Queue up your favorite Bollywood, Hollywood, or regional tracks for a seamless karaoke session.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenSearch();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Browse & Add Songs</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((song, idx) => (
                  <div
                    key={`${song.id}-${idx}`}
                    className="group relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all flex items-center justify-between gap-2.5"
                  >
                    {/* Index & Cover */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-bold text-slate-500 w-4 text-center">
                        {idx + 1}
                      </span>
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="truncate">
                        <h5 className="text-xs font-bold text-white truncate">{song.title}</h5>
                        <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDuration(song.durationSeconds)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Play Immediately */}
                      <button
                        onClick={() => onPlaySongNow(song, idx)}
                        className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all"
                        title="Sing this song now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* Reorder Up */}
                      {idx > 0 && (
                        <button
                          onClick={() => onMoveQueueItem(idx, idx - 1)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Reorder Down */}
                      {idx < queue.length - 1 && (
                        <button
                          onClick={() => onMoveQueueItem(idx, idx + 1)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Remove */}
                      <button
                        onClick={() => onRemoveFromQueue(idx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Search & Add Songs</span>
          </button>
        </div>

      </div>
    </div>
  );
};
