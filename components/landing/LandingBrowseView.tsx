'use client';

import React, { useState } from 'react';
import { SongMetadata } from '@/lib/types';
import { CURATED_SONGS } from '@/lib/curated-songs';
import {
  Search,
  Play,
  Mic2,
  Headphones,
  History,
  Music,
  ArrowRight,
  Loader2,
  Radio,
  CheckCircle2,
  Sparkles,
  Youtube,
  Disc,
  ListPlus,
} from 'lucide-react';

interface LandingBrowseViewProps {
  onSelectSongAndLaunchStage: (song: SongMetadata) => void;
  onOpenStage: () => void;
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  recentSongs: SongMetadata[];
  onAddToQueue?: (song: SongMetadata) => void;
}

export const LandingBrowseView: React.FC<LandingBrowseViewProps> = ({
  onSelectSongAndLaunchStage,
  onOpenStage,
  currentSong,
  isPlaying,
  onTogglePlay,
  recentSongs,
  onAddToQueue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [directYtLink, setDirectYtLink] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SongMetadata[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<'all' | 'bollywood' | 'hollywood'>('all');

  // Featured track
  const featuredSong = CURATED_SONGS[0];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else if (data.primary) {
        setSearchResults([data.primary]);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDirectYtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directYtLink.trim()) return;
    const match = directYtLink.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const ytId = match ? match[1] : directYtLink.trim();
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

    onSelectSongAndLaunchStage(customSong);
  };

  const filteredCurated = CURATED_SONGS.filter(
    (s) => selectedGenre === 'all' || s.genre === selectedGenre
  );

  return (
    <div className="w-full flex-1 flex flex-col items-center px-4 sm:px-8 py-8 max-w-7xl mx-auto space-y-12">
      
      {/* 1. EDITORIAL HERO FEATURE BANNER */}
      <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-[#111420] to-[#090b10] border border-white/10 p-6 sm:p-10 md:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
        
        {/* Subtle atmospheric ambient glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Left Column: Featured Track Info */}
        <div className="flex-1 space-y-5 text-left z-10 max-w-2xl">
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Featured Track
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Full Synchronized Lyrics
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {featuredSong.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-medium">
              {featuredSong.artist} <span className="text-slate-500">•</span> {featuredSong.album}
            </p>
          </div>

          {/* Musical Metadata Tags */}
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-slate-300">
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
              Key: {featuredSong.musicalKey || 'D# Minor'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
              Tempo: {featuredSong.bpm || 94} BPM
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
              Vocal Range: {featuredSong.vocalRange || 'A#2 - F#4'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
              Duration: 4:22
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              onClick={() => onSelectSongAndLaunchStage(featuredSong)}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <Mic2 className="w-4 h-4" />
              <span>Sing Karaoke Version</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onAddToQueue && (
              <button
                onClick={() => onAddToQueue(featuredSong)}
                className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-semibold transition-all active:scale-95"
                title="Add Tum Hi Ho to Up Next Queue"
              >
                <ListPlus className="w-4 h-4 text-indigo-400" />
                <span>+ Add to Queue</span>
              </button>
            )}

            {currentSong && (
              <button
                onClick={onOpenStage}
                className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-semibold transition-all"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Return to Live Stage ({currentSong.title})</span>
              </button>
            )}
          </div>

        </div>

        {/* Right Column: Album Art */}
        <div className="relative group shrink-0 lg:mr-4">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
            {featuredSong.coverUrl && (
              <img
                src={featuredSong.coverUrl}
                alt={featuredSong.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
              <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md font-medium text-[11px] border border-white/10">
                Official Studio Master
              </span>
              <button
                onClick={() => onSelectSongAndLaunchStage(featuredSong)}
                className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 2. UNIVERSAL SEARCH COMMAND BAR */}
      <div className="w-full space-y-3">
        <form
          onSubmit={handleSearch}
          className="relative w-full flex items-center shadow-xl"
        >
          <Search className="w-5 h-5 text-slate-400 absolute left-4" />
          <input
            type="text"
            placeholder="Search any song, Bollywood, Hollywood, regional tracks, or artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-32 py-4 bg-slate-900/90 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{isSearching ? 'Searching...' : 'Search'}</span>
          </button>
        </form>

        {/* Quick Direct YouTube Link Input */}
        <form onSubmit={handleDirectYtSubmit} className="flex items-center gap-2 text-xs">
          <div className="relative flex-1">
            <Youtube className="w-4 h-4 text-red-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Or paste any YouTube link directly to sing with real-time vocal suppressor..."
              value={directYtLink}
              onChange={(e) => setDirectYtLink(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900/50 border border-white/5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
          >
            Load Track
          </button>
        </form>
      </div>

      {/* 3. ONLINE SEARCH RESULTS (When searched) */}
      {searchResults.length > 0 && (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h2 className="text-base font-bold text-white tracking-tight">
              Search Results ({searchResults.length})
            </h2>
            <button
              onClick={() => setSearchResults([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear Results
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((song) => (
              <div
                key={song.id}
                onClick={() => onSelectSongAndLaunchStage(song)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/50 cursor-pointer transition-all duration-200 group shadow-md"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  {song.coverUrl && (
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-13 h-13 rounded-xl object-cover shrink-0 border border-white/5 group-hover:scale-105 transition-transform"
                    />
                  )}
                  <div className="truncate">
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {song.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{song.artist}</p>
                    {song.hasSyncedLyrics && (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> Synced Lyrics
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-all shadow-md ml-2">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CURATED REPERTOIRE CATALOG */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Curated Karaoke Songs
            </h2>
          </div>

          <div className="flex gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10">
            {(['all', 'bollywood', 'hollywood'] as const).map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedGenre === genre
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {genre === 'all' ? 'All Songs' : genre}
              </button>
            ))}
          </div>
        </div>

        {/* Track Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCurated.map((song) => (
            <div
              key={song.id}
              onClick={() => onSelectSongAndLaunchStage(song)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-white/20 cursor-pointer transition-all duration-200 group shadow-md"
            >
              <div className="flex items-center gap-3.5 overflow-hidden">
                {song.coverUrl ? (
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="w-13 h-13 rounded-xl object-cover shrink-0 border border-white/5 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                )}
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                    {song.title}
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{song.artist}</p>
                  
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                    {song.musicalKey && (
                      <span className="text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {song.musicalKey}
                      </span>
                    )}
                    {song.hasSyncedLyrics && (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {onAddToQueue && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToQueue(song);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-200 border border-white/10 transition-all text-xs font-semibold"
                    title="Add to Up Next Queue"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="w-9 h-9 rounded-full bg-white/5 text-slate-300 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. RECENT SESSIONS SHELF */}
      {recentSongs.length > 0 && (
        <div className="w-full space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-slate-400">
            <History className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Recent Sessions
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentSongs.slice(0, 8).map((song) => (
              <div
                key={song.id}
                onClick={() => onSelectSongAndLaunchStage(song)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-white/20 cursor-pointer transition-all shadow-sm"
              >
                {song.coverUrl && (
                  <img
                    src={song.coverUrl}
                    alt={song.title}
                    className="w-10 h-10 rounded-lg object-cover border border-white/5"
                  />
                )}
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{song.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{song.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
