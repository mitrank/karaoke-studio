import { autoCorrelate, PitchResult } from './pitch-detector';

export class VocalStudioEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  // DSP Nodes
  private highPass: BiquadFilterNode | null = null;
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Reverb
  private convolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;

  // Echo / Delay
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private echoWetGain: GainNode | null = null;

  // Gains & Analysers
  private micMasterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Recording
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Hardware Devices State
  private currentInputDeviceId = '';
  private currentOutputDeviceId = '';
  private isInitialized = false;
  private isMicRunning = false;
  private pitchBuffer: Float32Array = new Float32Array(2048);

  private ensureAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Generate a lush algorithmic impulse response buffer for the Convolver
  private createImpulseResponse(duration = 2.5, decay = 2.0): AudioBuffer {
    const ctx = this.ensureAudioContext();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      const env = Math.pow(1 - n / length, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  // Query all audio hardware devices
  public async getAudioDevices(): Promise<{ inputs: MediaDeviceInfo[]; outputs: MediaDeviceInfo[] }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return { inputs: [], outputs: [] };
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      return { inputs, outputs };
    } catch (e) {
      console.error('Error enumerating devices:', e);
      return { inputs: [], outputs: [] };
    }
  }

  // Route audio output to headphones / external speakers
  public async setOutputDevice(deviceId: string): Promise<boolean> {
    const ctx = this.ensureAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (_) {}
    }
    this.currentOutputDeviceId = deviceId;
    if ('setSinkId' in ctx) {
      try {
        await (ctx as any).setSinkId(deviceId);
        return true;
      } catch (e) {
        console.warn('AudioContext.setSinkId error:', e);
        return false;
      }
    }
    return false;
  }

  // Play a clear 3-tone chime (C5 - E5 - G5) to test headphones
  public async playTestChime(targetDeviceId?: string): Promise<void> {
    const ctx = this.ensureAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (_) {}
    }

    const deviceId = targetDeviceId || this.currentOutputDeviceId;
    if (deviceId && 'setSinkId' in ctx) {
      try {
        await (ctx as any).setSinkId(deviceId);
      } catch (_) {}
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.24); // G5

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  public async startMic(preferredInputId?: string): Promise<boolean> {
    try {
      const ctx = this.ensureAudioContext();

      if (this.isMicRunning) {
        this.stopMic();
      }

      if (preferredInputId) {
        this.currentInputDeviceId = preferredInputId;
      }

      // If user had a selected output device, ensure sink is applied
      if (this.currentOutputDeviceId && 'setSinkId' in ctx) {
        try {
          await (ctx as any).setSinkId(this.currentOutputDeviceId);
        } catch (_) {}
      }

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      };

      if (this.currentInputDeviceId) {
        audioConstraints.deviceId = { exact: this.currentInputDeviceId };
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      this.micSource = ctx.createMediaStreamSource(this.micStream);

      // 1. High Pass filter to cut low rumble (e.g. mic handling noise, table thuds)
      this.highPass = ctx.createBiquadFilter();
      this.highPass.type = 'highpass';
      this.highPass.frequency.setValueAtTime(85, ctx.currentTime);

      // 2. 3-Band Equalizer for vocal presence
      this.eqLow = ctx.createBiquadFilter();
      this.eqLow.type = 'lowshelf';
      this.eqLow.frequency.setValueAtTime(250, ctx.currentTime);
      this.eqLow.gain.setValueAtTime(1.5, ctx.currentTime); // Gentle low warmth

      this.eqMid = ctx.createBiquadFilter();
      this.eqMid.type = 'peaking';
      this.eqMid.frequency.setValueAtTime(2800, ctx.currentTime);
      this.eqMid.Q.setValueAtTime(1.0, ctx.currentTime);
      this.eqMid.gain.setValueAtTime(2.0, ctx.currentTime); // Vocal clarity/presence

      this.eqHigh = ctx.createBiquadFilter();
      this.eqHigh.type = 'highshelf';
      this.eqHigh.frequency.setValueAtTime(9000, ctx.currentTime);
      this.eqHigh.gain.setValueAtTime(1.5, ctx.currentTime); // Sparkle / air

      // 3. Compressor & Soft Limiter
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-22, ctx.currentTime);
      this.compressor.knee.setValueAtTime(10, ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4.5, ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, ctx.currentTime);

      // 4. Reverb Section (Convolver + Dry/Wet)
      this.convolver = ctx.createConvolver();
      this.convolver.buffer = this.createImpulseResponse(2.2, 2.5);

      this.reverbDryGain = ctx.createGain();
      this.reverbWetGain = ctx.createGain();
      this.reverbDryGain.gain.setValueAtTime(1.0, ctx.currentTime);
      this.reverbWetGain.gain.setValueAtTime(0.35, ctx.currentTime);

      // 5. Echo / Delay Section
      this.delayNode = ctx.createDelay(1.0);
      this.delayNode.delayTime.setValueAtTime(0.24, ctx.currentTime);
      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.setValueAtTime(0.3, ctx.currentTime);
      this.echoWetGain = ctx.createGain();
      this.echoWetGain.gain.setValueAtTime(0.2, ctx.currentTime);

      // Delay feedback loop
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.echoWetGain);

      // 6. Mic Master Output & Analyser
      this.micMasterGain = ctx.createGain();
      this.micMasterGain.gain.setValueAtTime(1.0, ctx.currentTime);

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;

      // 7. Performance Recording Destination
      this.recordingDestination = ctx.createMediaStreamDestination();

      // --- WIRING UP THE AUDIO GRAPH ---
      this.micSource.connect(this.highPass);
      this.highPass.connect(this.eqLow);
      this.eqLow.connect(this.eqMid);
      this.eqMid.connect(this.eqHigh);
      this.eqHigh.connect(this.compressor);

      // Dry Path
      this.compressor.connect(this.reverbDryGain);
      this.reverbDryGain.connect(this.micMasterGain);

      // Reverb Path
      this.compressor.connect(this.convolver);
      this.convolver.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.micMasterGain);

      // Echo Path
      this.compressor.connect(this.delayNode);
      this.echoWetGain.connect(this.micMasterGain);

      // Output to Analyser & Speakers
      this.micMasterGain.connect(this.analyser);
      this.micMasterGain.connect(ctx.destination);
      this.micMasterGain.connect(this.recordingDestination);

      this.isMicRunning = true;
      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('Error starting microphone studio:', err);
      return false;
    }
  }

  public stopMic(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    this.isMicRunning = false;
  }

  public setMicVolume(val: number): void {
    if (this.micMasterGain && this.audioCtx) {
      this.micMasterGain.gain.setTargetAtTime(Math.max(0, val), this.audioCtx.currentTime, 0.02);
    }
  }

  public setReverb(val: number): void {
    if (this.reverbWetGain && this.audioCtx) {
      this.reverbWetGain.gain.setTargetAtTime(Math.max(0, Math.min(1.2, val)), this.audioCtx.currentTime, 0.02);
    }
  }

  public setEcho(val: number): void {
    if (this.echoWetGain && this.audioCtx) {
      this.echoWetGain.gain.setTargetAtTime(Math.max(0, Math.min(0.8, val)), this.audioCtx.currentTime, 0.02);
    }
  }

  public getCurrentPitch(): PitchResult | null {
    if (!this.analyser || !this.isMicRunning || !this.audioCtx) return null;
    this.analyser.getFloatTimeDomainData(this.pitchBuffer as any);
    return autoCorrelate(this.pitchBuffer, this.audioCtx.sampleRate);
  }

  // Get real-time RMS audio level (0.0 to 1.0) for live LED VU Meter
  public getMicLevel(): number {
    if (!this.analyser || !this.isMicRunning) return 0;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const val = (buffer[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / buffer.length);
    // Scale RMS for natural VU needle response
    return Math.min(1.0, Math.max(0, rms * 5));
  }

  // --- RECORDING STUDIO PERFORMANCE ---
  public startRecording(): boolean {
    if (!this.recordingDestination) return false;
    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(100);
      return true;
    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      return false;
    }
  }

  public stopRecording(): Promise<{ blob: Blob; url: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Recorder not active'));
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      };
      this.mediaRecorder.stop();
    });
  }

  public getIsMicRunning(): boolean {
    return this.isMicRunning;
  }
}

// Global Singleton for the browser session
let globalStudioEngine: VocalStudioEngine | null = null;

export function getVocalStudio(): VocalStudioEngine {
  if (typeof window === 'undefined') {
    return new VocalStudioEngine();
  }
  if (!globalStudioEngine) {
    globalStudioEngine = new VocalStudioEngine();
  }
  return globalStudioEngine;
}
