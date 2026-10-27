'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getVocalStudio } from '@/lib/audio/vocal-studio';
import {
  Mic,
  MicOff,
  Sliders,
  Volume2,
  Sparkles,
  Waves,
  Disc,
  Download,
  Square,
  Activity,
  Layers,
  ChevronUp,
  ChevronDown,
  Headphones,
} from 'lucide-react';

interface VocalStudioDockProps {
  onToggleVocalRemover: (active: boolean) => void;
  isVocalRemoverActive: boolean;
  pitchMonitorActive: boolean;
  onTogglePitchMonitor: (active: boolean) => void;
  onOpenAudioDevices: () => void;
  keyShift?: number;
  onKeyShiftChange?: (shift: number) => void;
}

export const VocalStudioDock: React.FC<VocalStudioDockProps> = ({
  onToggleVocalRemover,
  isVocalRemoverActive,
  pitchMonitorActive,
  onTogglePitchMonitor,
  onOpenAudioDevices,
  keyShift: externalKeyShift,
  onKeyShiftChange,
}) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [micVolume, setMicVolume] = useState(1.0);
  const [reverbAmount, setReverbAmount] = useState(0.35);
  const [echoAmount, setEchoAmount] = useState(0.15);
  const [internalKeyShift, setInternalKeyShift] = useState(0);

  const keyShift = externalKeyShift !== undefined ? externalKeyShift : internalKeyShift;
  const updateKeyShift = (val: number) => {
    if (onKeyShiftChange) {
      onKeyShiftChange(val);
    } else {
      setInternalKeyShift(val);
    }
  };
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [vuLevel, setVuLevel] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const vuRafRef = useRef<number | null>(null);
  const studio = getVocalStudio();

  // Monitor live mic level for VU Meter
  useEffect(() => {
    if (!isMicOn) {
      setVuLevel(0);
      if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current);
      return;
    }

    const pollVu = () => {
      const level = studio.getMicLevel();
      setVuLevel((prev) => prev * 0.7 + level * 0.3);
      vuRafRef.current = requestAnimationFrame(pollVu);
    };

    vuRafRef.current = requestAnimationFrame(pollVu);
    return () => {
      if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current);
    };
  }, [isMicOn]);

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (isMicOn) {
      studio.stopMic();
      setIsMicOn(false);
    } else {
      const savedInputId = localStorage.getItem('karaoke_audio_input_id') || undefined;
      const success = await studio.startMic(savedInputId);
      if (success) {
        setIsMicOn(true);
        studio.setMicVolume(micVolume);
        studio.setReverb(reverbAmount);
        studio.setEcho(echoAmount);
      }
    }
  };

  const handleMicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMicVolume(val);
    studio.setMicVolume(val);
  };

  const handleReverbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setReverbAmount(val);
    studio.setReverb(val);
  };

  const handleEchoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setEchoAmount(val);
    studio.setEcho(val);
  };

  // Performance Recording
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        const { url } = await studio.stopRecording();
        setRecordedUrl(url);
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
      setIsRecording(false);
    } else {
      setRecordedUrl(null);
      setRecordSeconds(0);
      const success = studio.startRecording();
      if (success) {
        setIsRecording(true);
        timerRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const totalSegments = 10;
  const activeSegments = Math.round(vuLevel * totalSegments);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col items-center px-2 pb-2 sm:px-4 sm:pb-3 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-4xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2.5 sm:p-3 text-white transition-all duration-300">
        
        {/* Main Audio Controls Strip */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 flex-wrap sm:flex-nowrap">
          
          {/* Section 1: Microphone Switch & VU Meter */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleToggleMic}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all border ${
                isMicOn
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-slate-400" />}
              <span className="hidden sm:inline">{isMicOn ? 'Microphone Active' : 'Enable Mic'}</span>
              <span className="sm:hidden">{isMicOn ? 'Mic On' : 'Mic'}</span>
            </button>

            {/* Visual VU Meter */}
            {isMicOn && (
              <div
                className="hidden sm:flex items-center gap-0.5 bg-black/50 px-2 py-2 rounded-lg border border-white/5"
                title="Microphone input volume"
              >
                {Array.from({ length: totalSegments }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-3 rounded-xs transition-colors duration-75 ${
                      i < activeSegments
                        ? i >= 8
                          ? 'bg-rose-500'
                          : i >= 6
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Studio Audio FX (Vocal Remover & Pitch Tuner) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Center Channel Vocal Suppressor */}
            <button
              onClick={() => onToggleVocalRemover(!isVocalRemoverActive)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium border transition-all ${
                isVocalRemoverActive
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Isolates backing music by suppressing centered vocal tracks"
            >
              <Layers className="w-3.5 h-3.5" />
              <span><span className="hidden sm:inline">Vocal </span>Suppressor{isVocalRemoverActive ? ' (ON)' : ''}</span>
            </button>

            {/* Pitch Tuner */}
            <button
              onClick={() => onTogglePitchMonitor(!pitchMonitorActive)}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                pitchMonitorActive
                  ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Pitch Guide</span>
            </button>
          </div>

          {/* Section 3: Hardware Routing, Key Transpose, and Take Recorder */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Audio Devices Modal Launcher */}
            <button
              onClick={onOpenAudioDevices}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all"
              title="Configure Headphones & Microphone Output"
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Routing</span>
            </button>

            {/* Key Transposer */}
            <div className="flex items-center bg-black/40 rounded-xl px-1.5 sm:px-2 py-1 border border-white/10 text-xs" title="Key Transposition (-6 to +6 Semitones)">
              <span className="text-slate-400 mr-1 sm:mr-1.5 text-[10px] sm:text-[11px]">Key:</span>
              <button
                onClick={() => updateKeyShift(Math.max(-6, keyShift - 1))}
                className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-all"
                title="Lower key by 1 semitone"
              >
                -
              </button>
              <span className="w-6 sm:w-7 text-center font-bold text-white text-xs">
                {keyShift > 0 ? `+${keyShift}` : keyShift}
              </span>
              <button
                onClick={() => updateKeyShift(Math.min(6, keyShift + 1))}
                className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-all"
                title="Raise key by 1 semitone"
              >
                +
              </button>
            </div>

            {/* Performance Recorder */}
            <button
              onClick={handleToggleRecord}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all border ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md animate-pulse'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Disc className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isRecording ? `Recording (${formatTime(recordSeconds)})` : 'Record Take'}</span>
              <span className="sm:hidden">{isRecording ? formatTime(recordSeconds) : 'Rec'}</span>
            </button>

            {/* Download Take */}
            {recordedUrl && (
              <a
                href={recordedUrl}
                download="my_vocal_take.webm"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Take</span>
              </a>
            )}

            {/* Expand / Collapse DSP Controls */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
              title="Vocal DSP Controls"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Expandable Precision DSP Sliders */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Mic Gain */}
            <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Mic Volume
                </span>
                <span className="text-emerald-400 font-bold">{Math.round(micVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={micVolume}
                onChange={handleMicVolumeChange}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Concert Hall Reverb */}
            <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Studio Reverb
                </span>
                <span className="text-indigo-400 font-bold">{Math.round(reverbAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={reverbAmount}
                onChange={handleReverbChange}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Vocal Delay */}
            <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-purple-400" /> Vocal Echo
                </span>
                <span className="text-purple-400 font-bold">{Math.round(echoAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={echoAmount}
                onChange={handleEchoChange}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
