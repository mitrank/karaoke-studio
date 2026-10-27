'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

interface YouTubePlayerProps {
  videoId: string;
  songId?: string;
  isPlaying: boolean;
  currentTimeMs: number;
  onTimeUpdate: (currentTimeMs: number, durationMs: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onTrackEnded?: () => void;
  volume: number; // 0 to 1
  showVideo: boolean;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(({
  videoId,
  songId,
  isPlaying,
  currentTimeMs,
  onTimeUpdate,
  onPlayStateChange,
  onTrackEnded,
  volume,
  showVideo,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Live timestamp refs
  const latestTimeSecRef = useRef<number>(0);
  const pendingSeekSecondsRef = useRef<number | null>(null);
  const currentVideoIdRef = useRef<string>(videoId);
  const currentSongIdRef = useRef<string | undefined>(songId);
  const isMutedForToggleRef = useRef<boolean>(false);
  const onTrackEndedRef = useRef(onTrackEnded);

  useEffect(() => {
    onTrackEndedRef.current = onTrackEnded;
  }, [onTrackEnded]);

  // Expose imperative player actions to parent
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      latestTimeSecRef.current = seconds;
      pendingSeekSecondsRef.current = seconds;
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.seekTo(Math.max(0, seconds), true);
        } catch (_) {}
      }
    },
    play: () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        try {
          playerRef.current.playVideo();
        } catch (_) {}
      }
    },
    pause: () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        try {
          playerRef.current.pauseVideo();
        } catch (_) {}
      }
    },
    getCurrentTime: () => latestTimeSecRef.current,
  }));

  // 1. Load YouTube IFrame API script once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const existingTag = document.getElementById('youtube-iframe-api');
    if (!existingTag) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };
  }, []);

  // 2. Initialize YouTube Player ONCE when API is ready
  useEffect(() => {
    if (!isApiReady || !containerRef.current || playerRef.current) return;

    currentVideoIdRef.current = videoId;
    const initialSeek = currentTimeMs > 0 ? currentTimeMs / 1000 : 0;
    if (initialSeek > 0) {
      pendingSeekSecondsRef.current = initialSeek;
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
      },
      events: {
        onReady: (event: any) => {
          setIsPlayerReady(true);
          try {
            event.target.setVolume(Math.round(volume * 100));
            if (pendingSeekSecondsRef.current !== null && pendingSeekSecondsRef.current > 0) {
              event.target.seekTo(pendingSeekSecondsRef.current, true);
            }
            if (isPlaying) {
              event.target.playVideo();
            }
          } catch (_) {}
        },
        onStateChange: (event: any) => {
          if (!window.YT) return;
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            onPlayStateChange(true);
            if (pendingSeekSecondsRef.current !== null) {
              const target = pendingSeekSecondsRef.current;
              event.target.seekTo(target, true);
              pendingSeekSecondsRef.current = null;
            }
            // Safely restore volume after seamless track transition
            if (isMutedForToggleRef.current) {
              isMutedForToggleRef.current = false;
              setTimeout(() => {
                try {
                  event.target.unMute();
                  event.target.setVolume(Math.round(volume * 100));
                } catch (_) {}
              }, 80);
            }
          } else if (state === window.YT.PlayerState.BUFFERING) {
            if (pendingSeekSecondsRef.current !== null) {
              event.target.seekTo(pendingSeekSecondsRef.current, true);
            }
          } else if (state === window.YT.PlayerState.PAUSED) {
            onPlayStateChange(false);
          } else if (state === window.YT.PlayerState.ENDED) {
            onPlayStateChange(false);
            if (onTrackEndedRef.current) {
              onTrackEndedRef.current();
            }
          }
        },
        onError: (e: any) => {
          console.warn('YouTube Player error:', e);
        },
      },
    });

    return () => {
      // Clean up player on unmount only
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
        setIsPlayerReady(false);
      }
    };
  }, [isApiReady]); // NOTE: NEVER include videoId here, to prevent recreating the player!

  // 3. Handle track switching (New Song vs Seamless Toggle)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    if (currentVideoIdRef.current === videoId && currentSongIdRef.current === songId) return;

    const isDifferentSong = currentSongIdRef.current !== songId;
    currentSongIdRef.current = songId;
    currentVideoIdRef.current = videoId;

    if (isDifferentSong) {
      // CASE A: NEW SONG (from queue, search, or library) -> Always start at 0:00
      latestTimeSecRef.current = 0;
      pendingSeekSecondsRef.current = 0;
      isMutedForToggleRef.current = false;

      try {
        if (typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
          playerRef.current.setVolume(Math.round(volume * 100));
        }
        if (typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId: videoId,
            startSeconds: 0,
          });
          playerRef.current.seekTo(0, true);
          if (isPlaying) {
            playerRef.current.playVideo();
          }
        }
      } catch (err) {
        console.warn('Error loading new track:', err);
      }
    } else {
      // CASE B: SAME SONG TOGGLE (Karaoke <-> Original) -> Seamless position with zero pop/spark
      const currentSec = latestTimeSecRef.current > 0 
        ? latestTimeSecRef.current 
        : (currentTimeMs > 0 ? currentTimeMs / 1000 : 0);

      pendingSeekSecondsRef.current = currentSec;
      isMutedForToggleRef.current = true;

      try {
        // MUTE IMMEDIATELY before switching to eliminate loud burst / spark sound
        if (typeof playerRef.current.mute === 'function') {
          playerRef.current.mute();
        }

        if (typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId: videoId,
            startSeconds: currentSec,
          });
          playerRef.current.seekTo(currentSec, true);
          if (isPlaying) {
            playerRef.current.playVideo();
          }
        }
      } catch (err) {
        console.warn('Error seamlessly switching track mode:', err);
      }
    }
  }, [videoId, songId, isPlayerReady]);

  // 4. Sync play/pause prop with YouTube Player
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;
    try {
      const state = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
      if (isPlaying && state !== 1 && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === 1 && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } catch (_) {}
  }, [isPlaying, isPlayerReady]);

  // 5. Sync volume prop
  useEffect(() => {
    if (isPlayerReady && playerRef.current && typeof playerRef.current.setVolume === 'function') {
      try {
        playerRef.current.setVolume(Math.round(volume * 100));
      } catch (_) {}
    }
  }, [volume, isPlayerReady]);

  // 6. High-frequency polling for lyrics sync (40ms = 25fps)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentSec = playerRef.current.getCurrentTime() || 0;
          const durationSec = playerRef.current.getDuration() || 0;
          latestTimeSecRef.current = currentSec;
          onTimeUpdate(Math.round(currentSec * 1000), Math.round(durationSec * 1000));
        } catch (_) {}
      }
    }, 40);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onTimeUpdate]);

  return (
    <div
      className={`relative transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl ${
        showVideo
          ? 'w-full aspect-video max-w-4xl mx-auto opacity-100 mb-6'
          : 'w-0 h-0 opacity-0 pointer-events-none absolute'
      }`}
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';
