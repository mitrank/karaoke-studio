'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getVocalStudio } from '@/lib/audio/vocal-studio';
import { Activity } from 'lucide-react';

interface PitchVisualizerProps {
  isActive: boolean;
}

export const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [currentHz, setCurrentHz] = useState<number | null>(null);
  const [centsOff, setCentsOff] = useState<number>(0);
  const historyRef = useRef<number[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setCurrentNote(null);
      setCurrentHz(null);
      return;
    }

    const studio = getVocalStudio();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      const pitch = studio.getCurrentPitch();

      if (pitch) {
        setCurrentNote(`${pitch.note}${pitch.octave}`);
        setCurrentHz(pitch.frequency);
        setCentsOff(pitch.centsOff);
        // Normalize frequency (60Hz to 800Hz) to 0-1 for canvas height
        const normalized = Math.min(1, Math.max(0, (pitch.frequency - 80) / 700));
        historyRef.current.push(normalized);
      } else {
        historyRef.current.push(-1); // No pitch detected (silence)
      }

      // Keep last 120 frames
      if (historyRef.current.length > 120) {
        historyRef.current.shift();
      }

      // Draw Pitch Waveform
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw faint pitch grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 10; y < height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center pitch reference line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw pitch curve
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let drawing = false;
      const step = width / 120;

      for (let i = 0; i < historyRef.current.length; i++) {
        const val = historyRef.current[i];
        const x = i * step;

        if (val >= 0) {
          const y = height - val * (height - 16) - 8;
          if (!drawing) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            drawing = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          if (drawing) {
            ctx.stroke();
            drawing = false;
          }
        }
      }
      if (drawing) ctx.stroke();

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive]);

  if (!isActive) return null;

  const isInTune = Math.abs(centsOff) <= 8 && currentHz !== null;

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900/90 border border-white/10 rounded-2xl p-3 shadow-xl backdrop-blur-md mb-4 flex items-center gap-4">
      {/* Musical Note Meter */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 bg-black/40 rounded-xl border border-white/10 text-white">
        <Activity className={`w-4 h-4 ${isInTune ? 'text-emerald-400' : 'text-amber-400'}`} />
        <div className="text-left">
          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Note</div>
          <div className="text-lg font-extrabold leading-none text-white font-mono">
            {currentNote || '--'}
          </div>
        </div>
      </div>

      {/* Real-time Oscilloscope Canvas */}
      <div className="flex-1 h-12 relative overflow-hidden rounded-xl bg-black/50 border border-white/5">
        <canvas ref={canvasRef} width={400} height={48} className="w-full h-full" />
      </div>

      {/* Cents & Hertz Readout */}
      <div className="text-right text-xs text-slate-300 min-w-[70px]">
        <div className="text-white font-medium">{currentHz ? `${Math.round(currentHz)} Hz` : 'Listening...'}</div>
        <div className={isInTune ? 'text-emerald-400 font-semibold' : centsOff > 0 ? 'text-amber-400' : 'text-indigo-400'}>
          {currentHz ? (isInTune ? 'In Tune' : `${centsOff > 0 ? '+' : ''}${centsOff}¢`) : ''}
        </div>
      </div>
    </div>
  );
};
