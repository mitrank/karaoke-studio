/**
 * Real-time Web Audio Vocal Remover with Bass Recovery
 * Guarantees pristine True Stereo (L/R) during normal playback,
 * and seamless phase cancellation (L - R) with bass recovery when vocal removal is active.
 */

export class WebAudioVocalRemover {
  private ctx: AudioContext;
  private splitter: ChannelSplitterNode;
  private merger: ChannelMergerNode;

  // Normal Stereo Passthrough Path (True Stereo)
  private stereoLeftGain: GainNode;
  private stereoRightGain: GainNode;

  // Phase Cancellation Path (L - R)
  private cancelLeftGain: GainNode;
  private cancelRightGain: GainNode;
  private cancelMonoSum: GainNode;

  // Bass Recovery Path
  private bassFilter: BiquadFilterNode;
  private bassGain: GainNode;

  private masterGain: GainNode;
  private isRemovalActive = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.splitter = ctx.createChannelSplitter(2);
    this.merger = ctx.createChannelMerger(2);

    // 1. Stereo Passthrough Nodes
    this.stereoLeftGain = ctx.createGain();
    this.stereoRightGain = ctx.createGain();
    this.stereoLeftGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.stereoRightGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // 2. Cancellation Nodes
    this.cancelLeftGain = ctx.createGain();
    this.cancelRightGain = ctx.createGain();
    this.cancelMonoSum = ctx.createGain();
    this.cancelLeftGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.cancelRightGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.cancelMonoSum.gain.setValueAtTime(0.0, ctx.currentTime);

    // 3. Bass Recovery Filter
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.setValueAtTime(150, ctx.currentTime);
    this.bassGain = ctx.createGain();
    this.bassGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // --- WIRING STEREO PATH ---
    // Splitter 0 (Left) -> stereoLeftGain -> Merger 0 (Left Output)
    this.splitter.connect(this.stereoLeftGain, 0);
    this.stereoLeftGain.connect(this.merger, 0, 0);

    // Splitter 1 (Right) -> stereoRightGain -> Merger 1 (Right Output)
    this.splitter.connect(this.stereoRightGain, 1);
    this.stereoRightGain.connect(this.merger, 0, 1);

    // --- WIRING CANCELLATION PATH ---
    this.splitter.connect(this.cancelLeftGain, 0);
    this.splitter.connect(this.cancelRightGain, 1);
    this.cancelLeftGain.connect(this.cancelMonoSum);
    this.cancelRightGain.connect(this.cancelMonoSum);

    // Send canceled mono signal to both Left and Right outputs
    this.cancelMonoSum.connect(this.merger, 0, 0);
    this.cancelMonoSum.connect(this.merger, 0, 1);

    // --- WIRING BASS RECOVERY PATH ---
    this.splitter.connect(this.bassFilter, 0);
    this.splitter.connect(this.bassFilter, 1);
    this.bassFilter.connect(this.bassGain);
    this.bassGain.connect(this.merger, 0, 0);
    this.bassGain.connect(this.merger, 0, 1);

    this.merger.connect(this.masterGain);
  }

  public getInputNode(): ChannelSplitterNode {
    return this.splitter;
  }

  public getOutputNode(): GainNode {
    return this.masterGain;
  }

  public setVocalRemoval(enabled: boolean): void {
    this.isRemovalActive = enabled;
    const now = this.ctx.currentTime;
    const rampTime = 0.03;

    if (enabled) {
      // Mute direct stereo
      this.stereoLeftGain.gain.setTargetAtTime(0.0, now, rampTime);
      this.stereoRightGain.gain.setTargetAtTime(0.0, now, rampTime);

      // Activate cancellation (L - R)
      this.cancelLeftGain.gain.setTargetAtTime(1.0, now, rampTime);
      this.cancelRightGain.gain.setTargetAtTime(-1.0, now, rampTime);
      this.cancelMonoSum.gain.setTargetAtTime(1.0, now, rampTime);

      // Boost bass recovery to keep kick & bass
      this.bassGain.gain.setTargetAtTime(1.0, now, rampTime);
    } else {
      // Restore true stereo
      this.stereoLeftGain.gain.setTargetAtTime(1.0, now, rampTime);
      this.stereoRightGain.gain.setTargetAtTime(1.0, now, rampTime);

      // Mute cancellation
      this.cancelLeftGain.gain.setTargetAtTime(0.0, now, rampTime);
      this.cancelRightGain.gain.setTargetAtTime(0.0, now, rampTime);
      this.cancelMonoSum.gain.setTargetAtTime(0.0, now, rampTime);
      this.bassGain.gain.setTargetAtTime(0.0, now, rampTime);
    }
  }

  public getIsActive(): boolean {
    return this.isRemovalActive;
  }
}
