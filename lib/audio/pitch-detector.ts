/**
 * High-performance Pitch Detector using Normalized Square Difference / Autocorrelation (YIN-inspired)
 * Designed for real-time vocal pitch tracking in Web Audio.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface PitchResult {
  frequency: number;
  note: string;
  octave: number;
  centsOff: number;
  clarity: number; // 0 to 1
}

export function autoCorrelate(buffer: Float32Array, sampleRate: number): PitchResult | null {
  const SIZE = buffer.length;
  // Calculate RMS (volume level) to ignore background silence
  let sum = 0;
  for (let i = 0; i < SIZE; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / SIZE);
  if (rms < 0.015) {
    // Too quiet / silence
    return null;
  }

  // Trim silence from start and end
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.01;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.slice(r1, r2);
  const c = new Float32Array(trimmed.length).fill(0);
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  // Find the first peak
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;
  // Parabolic interpolation for sub-sample accuracy
  if (maxpos > 0 && maxpos < trimmed.length - 1) {
    const x1 = c[maxpos - 1];
    const x2 = c[maxpos];
    const x3 = c[maxpos + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) {
      T0 = T0 - b / (2 * a);
    }
  }

  const fundamentalFreq = sampleRate / T0;
  // Human vocal range typically 65Hz (C2) to 1100Hz (C6)
  if (fundamentalFreq < 65 || fundamentalFreq > 1150) {
    return null;
  }

  return frequencyToNote(fundamentalFreq, maxval / c[0]);
}

export function frequencyToNote(frequency: number, clarity: number): PitchResult {
  const A4 = 440;
  const semitonesFromA4 = 12 * (Math.log2(frequency / A4));
  const midiNote = Math.round(semitonesFromA4) + 69;
  const noteIndex = (midiNote % 12 + 12) % 12;
  const octave = Math.floor(midiNote / 12) - 1;
  const exactMidi = semitonesFromA4 + 69;
  const centsOff = Math.round((exactMidi - midiNote) * 100);

  return {
    frequency: Math.round(frequency * 10) / 10,
    note: NOTE_NAMES[noteIndex],
    octave,
    centsOff,
    clarity: Math.min(Math.max(clarity, 0), 1),
  };
}
