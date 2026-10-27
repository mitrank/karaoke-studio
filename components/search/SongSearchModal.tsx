'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SongMetadata } from '@/lib/types';
import { CURATED_SONGS } from '@/lib/curated-songs';
import {
  Search,
  Youtube,
  Music,
  X,
  Loader2,
  Play,
  History,
  CheckCircle2,
  Upload,
  ListPlus,
  FileAudio,
} from 'lucide-react';

interface SongSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: SongMetadata) => void;
  onAddToQueue?: (song: SongMetadata) => void;
}

export const SongSearchModal: React.FC<SongSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSong,
  onAddToQueue,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'bollywood' | 'hollywood' | 'recent' | 'upload'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customYtInput, setCustomYtInput] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<SongMetadata[]>([]);
  const [recentSongs, setRecentSongs] = useState<SongMetadata[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load recent songs from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('karaoke_recent_songs');
        if (stored) {
          setRecentSongs(JSON.parse(stored));
        }
      } catch (_) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter curated songs based on tab and query
  const filteredCurated = CURATED_SONGS.filter((s) => {
    const matchesTab = activeTab === 'all' || s.genre === activeTab;
    const matchesQuery =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  // Save selected song to recent songs
  const handlePickSong = (song: SongMetadata) => {
    const curatedMatch = CURATED_SONGS.find(
      (c) => c.id === song.id || c.title.toLowerCase().trim() === song.title.toLowerCase().trim()
    );
    const songToLoad: SongMetadata = curatedMatch
      ? { ...song, ...curatedMatch, lyrics: curatedMatch.lyrics }
      : song;

    try {
      const existing = recentSongs.filter((s) => s.id !== songToLoad.id);
      const updated = [songToLoad, ...existing].slice(0, 20);
      setRecentSongs(updated);
      localStorage.setItem('karaoke_recent_songs', JSON.stringify(updated));
    } catch (_) {}

    onSelectSong(songToLoad);
    onClose();
  };

  // Add song to Queue
  const handleQueueSong = (e: React.MouseEvent, song: SongMetadata) => {
    e.stopPropagation();
    if (onAddToQueue) {
      const curatedMatch = CURATED_SONGS.find(
        (c) => c.id === song.id || c.title.toLowerCase().trim() === song.title.toLowerCase().trim()
      );
      const songToQueue = curatedMatch
        ? { ...song, ...curatedMatch, lyrics: curatedMatch.lyrics }
        : song;
      onAddToQueue(songToQueue);
    }
  };

  // Extract YouTube ID from link or raw ID
  const extractYouTubeId = (input: string): string => {
    const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : input.trim();
  };

  // Handle custom YouTube input
  const handleCustomYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customYtInput.trim()) return;

    const ytId = extractYouTubeId(customYtInput);
    if (!ytId) return;

    const customSong: SongMetadata = {
      id: `custom-yt-${ytId}`,
      title: `Custom Track (${ytId})`,
      artist: 'YouTube Audio Stream',
      durationSeconds: 240,
      karaokeYoutubeId: ytId,
      originalYoutubeId: ytId,
      activeTrackMode: 'karaoke',
      hasSyncedLyrics: false,
      sourceType: 'youtube',
      coverUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      qualityBadge: 'Custom Video',
    };

    handlePickSong(customSong);
  };

  // Perform universal online search across YouTube & LRCLIB
  const handleOnlineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingOnline(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setOnlineResults(data.results);
      } else if (data.primary) {
        setOnlineResults([data.primary]);
      } else {
        setOnlineResults([]);
      }
    } catch (err) {
      console.error('Universal search error:', err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Handle Local Audio File Selection (.mp3, .wav, .m4a, etc.)
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    let title = cleanName;
    let artist = 'Local Audio';

    if (cleanName.includes('-')) {
      const parts = cleanName.split('-');
      artist = parts[0].trim();
      title = parts.slice(1).join('-').trim();
    }

    const objectUrl = URL.createObjectURL(file);

    const localSong: SongMetadata = {
      id: `local-${Date.now()}`,
      title: title || 'Custom Audio File',
      artist: artist || 'Local Device',
      durationSeconds: 240,
      karaokeYoutubeId: '',
      sourceType: 'local',
      localAudioUrl: objectUrl,
      hasSyncedLyrics: false,
      qualityBadge: 'Local Stereo (DSP Vocal Remover Ready)',
    };

    // Query LRCLIB in background for synced lyrics match
    fetch(`/api/lyrics?track=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.syncedLyrics && data.syncedLyrics.length > 0) {
          localSong.lyrics = data.syncedLyrics;
          localSong.hasSyncedLyrics = true;
        }
      })
      .catch(() => {})
      .finally(() => {
        handlePickSong(localSong);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Song Library & Search</h2>
              <p className="text-xs text-slate-400">Search 50M+ tracks across YouTube, local files & synced lyrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Custom Input Bar */}
        <div className="p-4 sm:p-5 space-y-3.5 border-b border-white/5 bg-black/30">
          {/* Universal Search Form */}
          <form onSubmit={handleOnlineSearch} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search any Hollywood, Bollywood, or regional song..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-28 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={isSearchingOnline}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
            >
              {isSearchingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </button>
          </form>

          {/* Paste Any YouTube URL directly */}
          <form onSubmit={handleCustomYouTube} className="flex gap-2">
            <div className="relative flex-1">
              <Youtube className="w-4 h-4 text-red-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Or paste any YouTube video link directly..."
                value={customYtInput}
                onChange={(e) => setCustomYtInput(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            >
              Load Link
            </button>
          </form>

          {/* Category Tabs */}
          <div className="flex gap-1.5 pt-1 overflow-x-auto">
            {(['all', 'bollywood', 'hollywood', 'recent', 'upload'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setOnlineResults([]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeTab === tab && onlineResults.length === 0
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'upload' && <Upload className="w-3 h-3 text-indigo-300" />}
                <span>
                  {tab === 'all'
                    ? 'Curated Hits'
                    : tab === 'recent'
                    ? `Recent (${recentSongs.length})`
                    : tab === 'upload'
                    ? 'Upload Local MP3'
                    : tab}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Songs List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {/* Upload Local Audio Tab */}
          {activeTab === 'upload' && onlineResults.length === 0 && (
            <div className="p-8 text-center border-2 border-dashed border-white/15 rounded-3xl bg-white/[0.02] hover:bg-white/[0.04] transition-all">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
                onChange={handleLocalFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                <FileAudio className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Sing with Your Own Audio File
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5 leading-relaxed">
                Upload any stereo MP3, WAV, or M4A file from your device. You can isolate backing music with our client-side <strong>Web Audio Vocal Suppressor</strong> ($L - R$ phase cancellation)!
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Select Audio File</span>
              </button>
            </div>
          )}

          {/* Online Search Results */}
          {onlineResults.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>Search Results ({onlineResults.length})</span>
              </div>
              <div className="space-y-2">
                {onlineResults.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => handlePickSong(song)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-black/40 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/50 cursor-pointer transition-all duration-150 group shadow-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {song.coverUrl && (
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform shrink-0"
                        />
                      )}
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {song.title}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {song.hasSyncedLyrics && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Synced
                        </span>
                      )}
                      {onAddToQueue && (
                        <button
                          onClick={(e) => handleQueueSong(e, song)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-white/10 transition-all text-xs font-semibold flex items-center gap-1"
                          title="Add to Up Next Queue"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Queue</span>
                        </button>
                      )}
                      <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-indigo-600 transition-all shadow-md">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recently Sung Tab */}
          {activeTab === 'recent' && onlineResults.length === 0 && (
            <div>
              {recentSongs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <History className="w-10 h-10 mx-auto mb-2 text-slate-500" />
                  <p className="text-sm">No recently sung songs yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Songs you search or sing will appear here automatically!
                  </p>
                </div>
              ) : (
                recentSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => handlePickSong(song)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-black/40 hover:bg-slate-800 border border-white/5 hover:border-white/20 cursor-pointer transition-all duration-150 group mb-2 shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {song.coverUrl ? (
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <Music className="w-6 h-6" />
                        </div>
                      )}
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {song.title}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {onAddToQueue && (
                        <button
                          onClick={(e) => handleQueueSong(e, song)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-white/10 transition-all text-xs font-semibold flex items-center gap-1"
                          title="Add to Up Next Queue"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Curated Songs */}
          {activeTab !== 'recent' && activeTab !== 'upload' && onlineResults.length === 0 && (
            <div>
              {filteredCurated.map((song) => (
                <div
                  key={song.id}
                  onClick={() => handlePickSong(song)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-black/40 hover:bg-slate-800 border border-white/5 hover:border-white/20 cursor-pointer transition-all duration-150 group mb-2 shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {song.coverUrl ? (
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:scale-105 transition-transform shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <Music className="w-6 h-6" />
                      </div>
                    )}
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {song.title}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {song.hasSyncedLyrics && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    )}
                    {onAddToQueue && (
                      <button
                        onClick={(e) => handleQueueSong(e, song)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-white/10 transition-all text-xs font-semibold flex items-center gap-1"
                        title="Add to Up Next Queue"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Queue</span>
                      </button>
                    )}
                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-indigo-600 transition-all shadow-md">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
