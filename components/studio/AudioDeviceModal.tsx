'use client';

import React, { useState, useEffect } from 'react';
import { getVocalStudio } from '@/lib/audio/vocal-studio';
import { Headphones, Mic, X, Check, BellRing, Info, Volume2, CheckCircle2 } from 'lucide-react';

interface AudioDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioDeviceModal: React.FC<AudioDeviceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');
  const [testChimePlaying, setTestChimePlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const studio = getVocalStudio();

  // Load available devices
  useEffect(() => {
    if (!isOpen) return;

    const loadDevices = async () => {
      let devs = await studio.getAudioDevices();
      
      // If devices have empty labels, prompt temporary getUserMedia to unlock permissions & device labels
      if (devs.inputs.length > 0 && !devs.inputs[0].label) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          devs = await studio.getAudioDevices();
          tempStream.getTracks().forEach((t) => t.stop());
        } catch (_) {}
      }

      setInputs(devs.inputs);
      setOutputs(devs.outputs);

      const savedInput = localStorage.getItem('karaoke_audio_input_id') || (devs.inputs[0]?.deviceId || '');
      const savedOutput = localStorage.getItem('karaoke_audio_output_id') || (devs.outputs[0]?.deviceId || '');
      setSelectedInputId(savedInput);
      setSelectedOutputId(savedOutput);
    };

    loadDevices();
  }, [isOpen]);

  const handleSelectOutput = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const devId = e.target.value;
    setSelectedOutputId(devId);
    localStorage.setItem('karaoke_audio_output_id', devId);
    const success = await studio.setOutputDevice(devId);
    if (success) {
      setStatusMessage('Output device updated! Playing test chime...');
      handlePlayChime(devId);
    }
  };

  const handleSelectInput = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const devId = e.target.value;
    setSelectedInputId(devId);
    localStorage.setItem('karaoke_audio_input_id', devId);
  };

  const handlePlayChime = async (overrideDeviceId?: string) => {
    setTestChimePlaying(true);
    await studio.playTestChime(overrideDeviceId || selectedOutputId);
    setTimeout(() => {
      setTestChimePlaying(false);
      setStatusMessage(null);
    }, 700);
  };

  if (!isOpen) return null;

  const currentOutputLabel = outputs.find((o) => o.deviceId === selectedOutputId)?.label || 'System Default Device';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Audio Hardware & Routing</h2>
              <p className="text-xs text-slate-400">Configure headphones and microphone routing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Output Device (Headphones / Speakers) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span>Headphones / Audio Output Device</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {outputs.length} devices detected
              </span>
            </div>

            <select
              value={selectedOutputId}
              onChange={handleSelectOutput}
              className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-sans"
            >
              {outputs.length === 0 ? (
                <option value="">Default System Output Device</option>
              ) : (
                outputs.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Audio Output Device ${idx + 1}`}
                  </option>
                ))
              )}
            </select>

            {/* Test Headphones Chime */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handlePlayChime()}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  testChimePlaying
                    ? 'bg-emerald-500 text-slate-950 font-bold animate-pulse'
                    : 'bg-white/10 hover:bg-white/15 text-slate-200'
                }`}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>{testChimePlaying ? 'Playing Sound in Headphones...' : 'Test Sound in Headphones'}</span>
              </button>

              {statusMessage && (
                <span className="text-xs text-emerald-400 font-medium">
                  {statusMessage}
                </span>
              )}
            </div>
          </div>

          {/* Microphone Input Device */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-400" />
                <span>Microphone Input Device</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {inputs.length} devices detected
              </span>
            </div>

            <select
              value={selectedInputId}
              onChange={handleSelectInput}
              className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-sans"
            >
              {inputs.length === 0 ? (
                <option value="">Default Microphone</option>
              ) : (
                inputs.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Microphone Input Device ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Important Windows / Browser Audio Note */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-indigo-300 font-bold">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>How Audio Routing Works:</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Your Live Voice & Reverb</strong>: Routed directly to your chosen headphones above with zero latency.
            </p>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              • <strong>Backing Music (YouTube)</strong>: Web browsers send embedded video audio to your <strong>Windows Default Output</strong>. If the backing track is playing on your laptop speakers instead of your headphones, simply click the sound/volume icon on your Windows taskbar and set your headphones as the default audio device!
            </p>
          </div>

          {/* Confirm Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Apply Hardware Routing</span>
          </button>

        </div>
      </div>
    </div>
  );
};
