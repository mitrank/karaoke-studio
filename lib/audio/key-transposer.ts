/**
 * Musical Key Transposer Utility
 * Transposes any standard musical key (e.g., "D# Minor", "C Major", "Bb Minor")
 * by a specified number of semitones (-6 to +6).
 */

const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_ALIAS_MAP: Record<string, number> = {
  'c': 0, 'b#': 0,
  'c#': 1, 'db': 1,
  'd': 2,
  'd#': 3, 'eb': 3,
  'e': 4, 'fb': 4,
  'f': 5, 'e#': 5,
  'f#': 6, 'gb': 6,
  'g': 7,
  'g#': 8, 'ab': 8,
  'a': 9,
  'a#': 10, 'bb': 10,
  'b': 11, 'cb': 11,
};

export function transposeKey(originalKey: string | undefined, semitones: number): string {
  if (!originalKey || semitones === 0) return originalKey || '';

  // Extract root note and mode (e.g. "D# Minor" -> root: "D#", mode: "Minor")
  const match = originalKey.trim().match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return originalKey;

  const root = match[1];
  const mode = match[2]; // e.g. " Minor", "m", " Major", "maj"

  const noteIndex = NOTE_ALIAS_MAP[root.toLowerCase()];
  if (noteIndex === undefined) return originalKey;

  // Calculate new chromatic index with wrap-around
  const newIndex = (noteIndex + semitones + 12 * 10) % 12;

  // Use flat representation if original used flat, otherwise sharp
  const useFlat = root.includes('b');
  const transposedRoot = useFlat ? CHROMATIC_FLAT[newIndex] : CHROMATIC_SHARP[newIndex];

  return `${transposedRoot}${mode}`;
}
