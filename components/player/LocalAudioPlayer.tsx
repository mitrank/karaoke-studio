'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { getVocalStudio } from '@/lib/audio/vocal-studio';
import { WebAudioVocalRemover } from '@/lib/audio/vocal-remover';

export interface LocalAudioPlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

interface LocalAudioPlayerProps {
  audioUrl: string;
  isPlaying: boolean;
  volume: number;
  isVocalRemoverActive: boolean;
  keyShift?: number;
  onTimeUpdate: (currentTimeMs: number, durationMs: number) => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onTrackEnded?: () => void;
}

export const LocalAudioPlayer = forwardRef<LocalAudioPlayerRef, LocalAudioPlayerProps>(({
  audioUrl,
  isPlaying,
  volume,
  isVocalRemoverActive,
  keyShift = 0,
  onTimeUpdate,
  onPlayStateChange,
  onTrackEnded,
}, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vocalRemoverRef = useRef<WebAudioVocalRemover | null>(null);
  const mediaSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isAudioConnectedRef = useRef(false);

  // Expose imperative actions
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, seconds);
      }
    },
    play: () => {
      audioRef.current?.play().catch(() => {});
    },
    pause: () => {
      audioRef.current?.pause();
    },
    getCurrentTime: () => audioRef.current?.currentTime || 0,
  }));

  // Setup Web Audio Graph for Vocal Remover & Recording Mix
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || isAudioConnectedRef.current) return;

    try {
      const studio = getVocalStudio();
      const ctx = studio.getAudioContext();

      if (!mediaSourceNodeRef.current) {
        mediaSourceNodeRef.current = ctx.createMediaElementSource(audioEl);
      }

      const remover = new WebAudioVocalRemover(ctx);
      vocalRemoverRef.current = remover;

      // Connect: audio -> remover -> destination & recording
      mediaSourceNodeRef.current.connect(remover.getInputNode());
      remover.getOutputNode().connect(ctx.destination);

      const recordingDest = studio.getRecordingDestination();
      if (recordingDest) {
        remover.getOutputNode().connect(recordingDest);
      }

      isAudioConnectedRef.current = true;
    } catch (e) {
      console.warn('Web Audio routing note for local file:', e);
    }
  }, [audioUrl]);

  // Synchronize Vocal Remover State
  useEffect(() => {
    if (vocalRemoverRef.current) {
      vocalRemoverRef.current.setVocalRemoval(isVocalRemoverActive);
    }
  }, [isVocalRemoverActive]);

  // Synchronize Play/Pause
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (isPlaying && el.paused) {
      const studio = getVocalStudio();
      const ctx = studio.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      el.play().catch(() => onPlayStateChange(false));
    } else if (!isPlaying && !el.paused) {
      el.pause();
    }
  }, [isPlaying, onPlayStateChange]);

  // Synchronize Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  // Synchronize Key Shift via Playback Pitch Rate
  useEffect(() => {
    if (audioRef.current && keyShift !== undefined) {
      // 1 semitone = 2^(1/12) ~= 1.05946
      // Standard pitch scaling
      const rate = Math.pow(2, keyShift / 12);
      // Bound within safe range
      const boundedRate = Math.max(0.5, Math.min(2.0, rate));
      audioRef.current.playbackRate = boundedRate;
    }
  }, [keyShift]);

  // Time & Event Listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime * 1000;
      const dur = (audioRef.current.duration || 0) * 1000;
      onTimeUpdate(Math.round(cur), Math.round(dur));
    }
  };

  const handleEnded = () => {
    onPlayStateChange(false);
    if (onTrackEnded) {
      onTrackEnded();
    }
  };

  return (
    <audio
      ref={audioRef}
      src={audioUrl}
      onTimeUpdate={handleTimeUpdate}
      onPlay={() => onPlayStateChange(true)}
      onPause={() => onPlayStateChange(false)}
      onEnded={handleEnded}
      preload="auto"
      className="hidden"
    />
  );
});

LocalAudioPlayer.displayName = 'LocalAudioPlayer';
