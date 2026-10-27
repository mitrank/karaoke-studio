'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SongMetadata, LyricLine } from '@/lib/types';
import { CURATED_SONGS } from '@/lib/curated-songs';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/player/YouTubePlayer';
import { LocalAudioPlayer, LocalAudioPlayerRef } from '@/components/player/LocalAudioPlayer';
import { MusicPlayerBar } from '@/components/player/MusicPlayerBar';
import { FloatingMiniPlayer } from '@/components/player/FloatingMiniPlayer';
import { LandingBrowseView } from '@/components/landing/LandingBrowseView';
import { KaraokeLyricsView } from '@/components/lyrics/KaraokeLyricsView';
import { VocalStudioDock } from '@/components/studio/VocalStudioDock';
import { PitchVisualizer } from '@/components/pitch/PitchVisualizer';
import { SongSearchModal } from '@/components/search/SongSearchModal';
import { TapToSyncModal } from '@/components/lyrics/TapToSyncModal';
import { AudioDeviceModal } from '@/components/studio/AudioDeviceModal';
import { SongQueueDrawer } from '@/components/queue/SongQueueDrawer';
import { transposeKey } from '@/lib/audio/key-transposer';
import {
  Search,
  Maximize2,
  Minimize2,
  Video,
  VideoOff,
  Clock,
  Mic2,
  Headphones,
  Compass,
  ArrowLeft,
  Music,
  ListMusic,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function KaraokeApp() {
  // Navigation view: 'browse' (Library) or 'stage' (Live singing room)
  const [currentView, setCurrentView] = useState<'browse' | 'stage'>('browse');

  const [currentSong, setCurrentSong] = useState<SongMetadata | null>(null);
  const [trackMode, setTrackMode] = useState<'karaoke' | 'original'>('karaoke');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [backingVolume, setBackingVolume] = useState(1.0);
  const [showVideo, setShowVideo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSyncEditorOpen, setIsSyncEditorOpen] = useState(false);
  const [isAudioDevicesOpen, setIsAudioDevicesOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isEncoreOpen, setIsEncoreOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recentSongs, setRecentSongs] = useState<SongMetadata[]>([]);
  const [queue, setQueue] = useState<SongMetadata[]>([]);

  // Musical Key Transposition Shift (-6 to +6 Semitones)
  const [keyShift, setKeyShift] = useState<number>(0);

  // Sync calibration offset in ms
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0);

  // Audio DSP State
  const [isVocalRemoverActive, setIsVocalRemoverActive] = useState(false);
  const [pitchMonitorActive, setPitchMonitorActive] = useState(false);

  const playerRef = useRef<YouTubePlayerRef>(null);
  const localPlayerRef = useRef<LocalAudioPlayerRef>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show Floating Toast Notification
  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Load recent songs and queue from storage on boot
  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem('karaoke_recent_songs');
      if (storedRecent) {
        setRecentSongs(JSON.parse(storedRecent));
      }
      const storedQueue = localStorage.getItem('karaoke_party_queue');
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      }
    } catch (_) {}
  }, []);

  // Sync queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('karaoke_party_queue', JSON.stringify(queue));
    } catch (_) {}
  }, [queue]);

  // Load saved sync offset when song changes
  useEffect(() => {
    if (!currentSong) return;
    const saved = localStorage.getItem(`karaoke_offset_${currentSong.id}`);
    if (saved !== null) {
      setSyncOffsetMs(parseInt(saved, 10));
    } else {
      setSyncOffsetMs(currentSong.defaultSyncOffsetMs || 0);
    }
  }, [currentSong?.id]);

  // Handle Sync Offset adjustments
  const handleAdjustSyncOffset = (deltaMs: number) => {
    if (!currentSong) return;
    setSyncOffsetMs((prev) => {
      const nextVal = prev + deltaMs;
      localStorage.setItem(`karaoke_offset_${currentSong.id}`, String(nextVal));
      return nextVal;
    });
  };

  const handleResetSyncOffset = () => {
    if (!currentSong) return;
    setSyncOffsetMs(0);
    localStorage.removeItem(`karaoke_offset_${currentSong.id}`);
  };

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Handle Scrubber Seeking
  const handleSeekSeconds = (seconds: number) => {
    if (currentSong?.sourceType === 'local') {
      localPlayerRef.current?.seekTo(seconds);
    } else {
      playerRef.current?.seekTo(seconds);
    }
    setCurrentTimeMs(Math.round(seconds * 1000));
  };

  // Handle Seeking when clicking a lyric line
  const handleSeekLyrics = (timeMs: number) => {
    const sec = timeMs / 1000;
    if (currentSong?.sourceType === 'local') {
      localPlayerRef.current?.seekTo(sec);
    } else {
      playerRef.current?.seekTo(sec);
    }
    setCurrentTimeMs(timeMs);
  };

  // Select a new song and launch stage
  const handleSelectSongAndLaunch = (song: SongMetadata) => {
    setIsEncoreOpen(false);

    // 1. Check if song matches any curated song (by ID or title) to ensure full synced lyrics
    const curatedMatch = CURATED_SONGS.find(
      (c) => c.id === song.id || c.title.toLowerCase().trim() === song.title.toLowerCase().trim()
    );
    const songToLoad: SongMetadata = curatedMatch
      ? { ...song, ...curatedMatch, lyrics: curatedMatch.lyrics }
      : song;

    // 2. If song has no lyrics yet, fetch in background from /api/lyrics
    if (!songToLoad.lyrics || songToLoad.lyrics.length === 0) {
      fetch(`/api/lyrics?track=${encodeURIComponent(songToLoad.title)}&artist=${encodeURIComponent(songToLoad.artist)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.syncedLyrics && data.syncedLyrics.length > 0) {
            setCurrentSong((prev) => (prev && prev.id === songToLoad.id ? { ...prev, lyrics: data.syncedLyrics, hasSyncedLyrics: true } : prev));
          }
        })
        .catch(() => {});
    }

    setCurrentSong(songToLoad);
    setIsPlaying(true);
    setCurrentTimeMs(0);
    setDurationMs((songToLoad.durationSeconds || 240) * 1000);
    setKeyShift(0); // Reset key shift for new song
    setCurrentView('stage');
    playerRef.current?.seekTo(0);
    localPlayerRef.current?.seekTo(0);

    // Add to recent songs
    try {
      const existing = recentSongs.filter((s) => s.id !== songToLoad.id);
      const updated = [songToLoad, ...existing].slice(0, 20);
      setRecentSongs(updated);
      localStorage.setItem('karaoke_recent_songs', JSON.stringify(updated));
    } catch (_) {}
  };

  // Dynamic Queue Management
  const handleAddToQueue = (song: SongMetadata) => {
    setQueue((prev) => [...prev, song]);
    showToast(`Added "${song.title}" to Up Next!`);
  };

  const handleRemoveFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMoveQueueItem = (fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const updated = [...prev];
      const item = updated.splice(fromIndex, 1)[0];
      updated.splice(toIndex, 0, item);
      return updated;
    });
  };

  const handleClearQueue = () => {
    setQueue([]);
  };

  const handlePlayQueueSongNow = (song: SongMetadata, queueIndex?: number) => {
    if (queueIndex !== undefined) {
      handleRemoveFromQueue(queueIndex);
    }
    handleSelectSongAndLaunch(song);
  };

  // Auto-advance when track finishes
  const handleTrackEnded = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue((prev) => prev.slice(1));
      showToast(`Up Next: ${nextTrack.title}`);
      handleSelectSongAndLaunch(nextTrack);
    } else {
      setIsPlaying(false);
      setIsEncoreOpen(true);
    }
  };

  // Seamless Track Toggle Handler
  const handleToggleTrackMode = (mode: 'karaoke' | 'original') => {
    setTrackMode(mode);
    const liveSec = currentTimeMs > 0 ? currentTimeMs / 1000 : 0;
    if (playerRef.current && liveSec > 0) {
      playerRef.current.seekTo(liveSec);
    }
  };

  // Handle custom lyrics applied from Tap-to-Sync editor
  const handleApplyCustomLyrics = (lines: LyricLine[]) => {
    if (!currentSong) return;
    setCurrentSong((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        hasSyncedLyrics: true,
        lyrics: lines,
      };
    });
  };

  // Active YouTube Video ID based on Track Mode
  const activeVideoId = currentSong && currentSong.sourceType !== 'local'
    ? trackMode === 'karaoke'
      ? currentSong.karaokeYoutubeId
      : (currentSong.originalYoutubeId || currentSong.karaokeYoutubeId)
    : null;

  // Transposed Musical Key string
  const currentTransposedKey = currentSong?.musicalKey
    ? transposeKey(currentSong.musicalKey, keyShift)
    : null;

  // Keyboard shortcut listener for quick play/pause (Spacebar when modals closed)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !isSearchOpen && !isSyncEditorOpen && !isAudioDevicesOpen && !isQueueOpen && !isEncoreOpen) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSearchOpen, isSyncEditorOpen, isAudioDevicesOpen, isQueueOpen, isEncoreOpen]);

  return (
    <main className="relative flex-1 flex flex-col min-h-screen bg-[#090b10] text-slate-100 overflow-y-auto">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-fade-in border border-indigo-400/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Application Header */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/5 bg-[#090b10]/90 backdrop-blur-xl flex-wrap gap-3">
        
        {/* Brand & Main View Navigation */}
        <div className="flex items-center gap-5">
          <div
            onClick={() => setCurrentView('browse')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-all">
              <Mic2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white block">
                Karaoke<span className="text-indigo-400">Studio</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium block">
                Live Vocal Platform
              </span>
            </div>
          </div>

          {/* Navigation Pill (Discover vs Live Stage) */}
          <div className="hidden sm:flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setCurrentView('browse')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                currentView === 'browse'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Browse</span>
            </button>
            <button
              onClick={() => {
                if (!currentSong) {
                  handleSelectSongAndLaunch(CURATED_SONGS[0]);
                } else {
                  setCurrentView('stage');
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                currentView === 'stage'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Stage</span>
            </button>
          </div>
        </div>

        {/* Center: Track Switcher (When on Stage & YouTube track loaded) */}
        {currentView === 'stage' && currentSong && currentSong.sourceType !== 'local' && (
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs shadow-inner">
            <button
              onClick={() => handleToggleTrackMode('karaoke')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                trackMode === 'karaoke'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Seamlessly switch to pure Karaoke backing track"
            >
              <span>🎤 Karaoke Track</span>
            </button>
            <button
              onClick={() => handleToggleTrackMode('original')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                trackMode === 'original'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Seamlessly switch to Original Artist studio master"
            >
              <span>🎧 Original Track</span>
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* Party Queue Button */}
          <button
            onClick={() => setIsQueueOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all relative"
            title="Open Up Next & Song Queue"
          >
            <ListMusic className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Queue</span>
            {queue.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                {queue.length}
              </span>
            )}
          </button>

          {/* Headphones & Hardware Settings Button */}
          <button
            onClick={() => setIsAudioDevicesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title="Configure Headphones & Audio Routing"
          >
            <Headphones className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Routing</span>
          </button>

          {/* Search Library Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-950 transition-all shadow-md active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search Library</span>
          </button>

          {/* Stage View Toggle Actions */}
          {currentView === 'stage' && (
            <>
              {/* Tap-to-Sync Lyrics Editor */}
              <button
                onClick={() => setIsSyncEditorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10"
                title="Create synced lyrics in 60 seconds"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Sync Editor</span>
              </button>

              {/* Toggle Backing Video (only for YouTube) */}
              {currentSong?.sourceType !== 'local' && (
                <button
                  onClick={() => setShowVideo(!showVideo)}
                  className={`p-2 rounded-xl text-xs border transition-all ${
                    showVideo
                      ? 'bg-white/20 border-white/40 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                  title={showVideo ? 'Hide Backing Video' : 'Show Backing Video'}
                >
                  {showVideo ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              )}

              {/* Fullscreen Stage Mode */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
                title="Fullscreen Stage Mode"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </header>

      {/* VIEW 1: BROWSE & DISCOVERY VIEW */}
      {currentView === 'browse' && (
        <>
          <LandingBrowseView
            onSelectSongAndLaunchStage={handleSelectSongAndLaunch}
            onOpenStage={() => setCurrentView('stage')}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            recentSongs={recentSongs}
            onAddToQueue={handleAddToQueue}
          />

          {/* Floating Mini Player when browsing */}
          <FloatingMiniPlayer
            currentSong={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            currentTimeMs={currentTimeMs}
            durationMs={durationMs}
            onOpenStage={() => setCurrentView('stage')}
          />
        </>
      )}

      {/* VIEW 2: LIVE PERFORMANCE STAGE VIEW */}
      {currentView === 'stage' && currentSong && (
        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col items-center p-3 sm:p-4 pb-36 space-y-3">
          
          {/* Back to Browse Button, Up Next Queue Button & Song Metadata on Stage */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView('browse')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Songs</span>
              </button>
              <button
                onClick={() => setIsQueueOpen(true)}
                className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-600/15 hover:bg-indigo-600/25 px-3 py-1.5 rounded-xl border border-indigo-500/30 transition-all font-medium"
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>Up Next ({queue.length})</span>
              </button>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-bold text-white block">{currentSong.title}</span>
                {currentSong.musicalKey && (
                  <span className="text-[11px] text-indigo-200 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-md font-mono font-medium" title="Musical Key">
                    {keyShift !== 0 ? `${currentSong.musicalKey} → ${currentTransposedKey} (${keyShift > 0 ? `+${keyShift}` : keyShift} st)` : currentSong.musicalKey}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 block">{currentSong.artist}</span>
            </div>
          </div>

          {/* Music Player Scrubber & Timeline Bar */}
          <MusicPlayerBar
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            currentTimeMs={currentTimeMs}
            durationMs={durationMs}
            onSeek={handleSeekSeconds}
            volume={backingVolume}
            onChangeVolume={setBackingVolume}
          />

          {/* Live Pitch Tuner Visualizer (when enabled) */}
          <PitchVisualizer isActive={pitchMonitorActive} />

          {/* Glowing Apple Music Style Synchronized Lyrics */}
          <KaraokeLyricsView
            lyrics={currentSong.lyrics || []}
            currentTimeMs={currentTimeMs}
            syncOffsetMs={syncOffsetMs}
            onAdjustSyncOffset={handleAdjustSyncOffset}
            onResetSyncOffset={handleResetSyncOffset}
            onSeek={handleSeekLyrics}
            showTransliteration={showTransliteration}
            onToggleTransliteration={() => setShowTransliteration(!showTransliteration)}
            isStageFullscreen={isFullscreen}
          />

        </div>
      )}

      {/* AUDIO ENGINE 1: Local Audio Player (for User MP3/WAV uploads with Web Audio Vocal Remover) */}
      {currentSong?.sourceType === 'local' && currentSong.localAudioUrl && (
        <LocalAudioPlayer
          ref={localPlayerRef}
          audioUrl={currentSong.localAudioUrl}
          isPlaying={isPlaying}
          volume={backingVolume}
          isVocalRemoverActive={isVocalRemoverActive}
          keyShift={keyShift}
          onTimeUpdate={(cur, dur) => {
            setCurrentTimeMs(cur);
            setDurationMs(dur);
          }}
          onPlayStateChange={setIsPlaying}
          onTrackEnded={handleTrackEnded}
        />
      )}

      {/* AUDIO ENGINE 2: Permanent YouTube Background Player (for Streaming & Verified Karaoke) */}
      {activeVideoId && currentSong?.sourceType !== 'local' && (
        <YouTubePlayer
          ref={playerRef}
          videoId={activeVideoId}
          songId={currentSong?.id}
          isPlaying={isPlaying}
          currentTimeMs={currentTimeMs}
          onTimeUpdate={(cur, dur) => {
            setCurrentTimeMs(cur);
            setDurationMs(dur);
          }}
          onPlayStateChange={setIsPlaying}
          onTrackEnded={handleTrackEnded}
          volume={backingVolume}
          showVideo={showVideo && currentView === 'stage'}
        />
      )}

      {/* Floating Singer Studio Dock (Mic, Effects, Key, Recorder) */}
      <VocalStudioDock
        onToggleVocalRemover={setIsVocalRemoverActive}
        isVocalRemoverActive={isVocalRemoverActive}
        pitchMonitorActive={pitchMonitorActive}
        onTogglePitchMonitor={setPitchMonitorActive}
        onOpenAudioDevices={() => setIsAudioDevicesOpen(true)}
        keyShift={keyShift}
        onKeyShiftChange={setKeyShift}
      />

      {/* Song Queue & Up Next Drawer */}
      <SongQueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        currentSong={currentSong}
        isPlaying={isPlaying}
        onPlaySongNow={handlePlayQueueSongNow}
        onRemoveFromQueue={handleRemoveFromQueue}
        onMoveQueueItem={handleMoveQueueItem}
        onClearQueue={handleClearQueue}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Headphones & Hardware Device Settings Modal */}
      <AudioDeviceModal
        isOpen={isAudioDevicesOpen}
        onClose={() => setIsAudioDevicesOpen(false)}
      />

      {/* Universal Search & YouTube Link Modal */}
      <SongSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSong={handleSelectSongAndLaunch}
        onAddToQueue={handleAddToQueue}
      />

      {/* Tap-to-Sync Lyric Creator Modal */}
      <TapToSyncModal
        isOpen={isSyncEditorOpen}
        onClose={() => setIsSyncEditorOpen(false)}
        currentTimeMs={currentTimeMs}
        onApplyLyrics={handleApplyCustomLyrics}
      />

      {/* Performance Complete / Encore Celebration Modal */}
      {isEncoreOpen && currentSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-xl">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">
                Performance Complete
              </span>
              <h3 className="text-2xl font-black text-white">Encore! 👏</h3>
              <p className="text-xs text-slate-300">
                You just sang <strong>{currentSong.title}</strong> by {currentSong.artist}.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => {
                  setIsEncoreOpen(false);
                  handleSeekSeconds(0);
                  setIsPlaying(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg active:scale-98"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sing Again (Replay)</span>
              </button>

              <button
                onClick={() => {
                  setIsEncoreOpen(false);
                  setIsSearchOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all"
              >
                <Search className="w-4 h-4" />
                <span>Pick Next Song from Library</span>
              </button>

              <button
                onClick={() => {
                  setIsEncoreOpen(false);
                  setCurrentView('browse');
                }}
                className="text-xs text-slate-400 hover:text-white pt-1 transition-colors"
              >
                Return to Browse View
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
