'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SongMetadata, LyricLine } from '@/lib/types';
import { CURATED_SONGS } from '@/lib/curated-songs';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/player/YouTubePlayer';
import { MusicPlayerBar } from '@/components/player/MusicPlayerBar';
import { FloatingMiniPlayer } from '@/components/player/FloatingMiniPlayer';
import { LandingBrowseView } from '@/components/landing/LandingBrowseView';
import { KaraokeLyricsView } from '@/components/lyrics/KaraokeLyricsView';
import { VocalStudioDock } from '@/components/studio/VocalStudioDock';
import { PitchVisualizer } from '@/components/pitch/PitchVisualizer';
import { SongSearchModal } from '@/components/search/SongSearchModal';
import { TapToSyncModal } from '@/components/lyrics/TapToSyncModal';
import { AudioDeviceModal } from '@/components/studio/AudioDeviceModal';
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
  const [recentSongs, setRecentSongs] = useState<SongMetadata[]>([]);

  // Sync calibration offset in ms
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0);

  // Audio DSP State
  const [isVocalRemoverActive, setIsVocalRemoverActive] = useState(false);
  const [pitchMonitorActive, setPitchMonitorActive] = useState(false);

  const playerRef = useRef<YouTubePlayerRef>(null);

  // Load recent songs on boot
  useEffect(() => {
    try {
      const stored = localStorage.getItem('karaoke_recent_songs');
      if (stored) {
        setRecentSongs(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

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
    playerRef.current?.seekTo(seconds);
    setCurrentTimeMs(Math.round(seconds * 1000));
  };

  // Handle Seeking when clicking a lyric line
  const handleSeekLyrics = (timeMs: number) => {
    const sec = timeMs / 1000;
    playerRef.current?.seekTo(sec);
    setCurrentTimeMs(timeMs);
  };

  // Select a new song and launch stage
  const handleSelectSongAndLaunch = (song: SongMetadata) => {
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
    setCurrentView('stage');

    // Add to recent songs
    try {
      const existing = recentSongs.filter((s) => s.id !== songToLoad.id);
      const updated = [songToLoad, ...existing].slice(0, 20);
      setRecentSongs(updated);
      localStorage.setItem('karaoke_recent_songs', JSON.stringify(updated));
    } catch (_) {}
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
  const activeVideoId = currentSong
    ? trackMode === 'karaoke'
      ? currentSong.karaokeYoutubeId
      : (currentSong.originalYoutubeId || currentSong.karaokeYoutubeId)
    : null;

  // Keyboard shortcut listener for quick play/pause (Spacebar when modals closed)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !isSearchOpen && !isSyncEditorOpen && !isAudioDevicesOpen) {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSearchOpen, isSyncEditorOpen, isAudioDevicesOpen]);

  return (
    <main className="relative flex-1 flex flex-col min-h-screen bg-[#090b10] text-slate-100 overflow-y-auto">
      
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

        {/* Center: Track Switcher (When on Stage & Song loaded) */}
        {currentView === 'stage' && currentSong && (
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
          {/* Headphones & Hardware Settings Button */}
          <button
            onClick={() => setIsAudioDevicesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
            title="Configure Headphones & Audio Routing"
          >
            <Headphones className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Audio Routing</span>
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

              {/* Toggle Backing Video */}
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
          
          {/* Back to Browse Button & Song Metadata on Stage */}
          <div className="w-full max-w-4xl flex items-center justify-between mb-2">
            <button
              onClick={() => setCurrentView('browse')}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 transition-all font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Songs</span>
            </button>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm font-bold text-white block">{currentSong.title}</span>
                {currentSong.musicalKey && (
                  <span className="text-[11px] text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 font-medium">
                    {currentSong.musicalKey}
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

      {/* Permanent YouTube Background Player (Hidden or Visible as toggled) */}
      {activeVideoId && (
        <YouTubePlayer
          ref={playerRef}
          videoId={activeVideoId}
          isPlaying={isPlaying}
          currentTimeMs={currentTimeMs}
          onTimeUpdate={(cur, dur) => {
            setCurrentTimeMs(cur);
            setDurationMs(dur);
          }}
          onPlayStateChange={setIsPlaying}
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
      />

      {/* Tap-to-Sync Lyric Creator Modal */}
      <TapToSyncModal
        isOpen={isSyncEditorOpen}
        onClose={() => setIsSyncEditorOpen(false)}
        currentTimeMs={currentTimeMs}
        onApplyLyrics={handleApplyCustomLyrics}
      />

    </main>
  );
}
