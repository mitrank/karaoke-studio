export interface LyricLine {
  id: string;
  timeMs: number;
  text: string;
  romanizedText?: string;
  durationMs?: number;
}

export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  karaokeYoutubeId: string; // Pure instrumental / karaoke backing track
  originalYoutubeId?: string; // Full song with artist vocals
  activeTrackMode?: 'karaoke' | 'original';
  hasSyncedLyrics: boolean;
  coverUrl?: string;
  genre?: 'bollywood' | 'tollywood' | 'hollywood' | 'punjabi' | 'regional' | 'pop';
  lyrics?: LyricLine[];
  plainLyrics?: string;
  sourceType: 'youtube' | 'local' | 'stream';
  defaultSyncOffsetMs?: number; // Pre-calibrated offset for this specific video
  musicalKey?: string;
  bpm?: number;
  year?: number;
  vocalRange?: string;
  qualityBadge?: string;
}

export interface AudioDeviceSettings {
  selectedInputId: string;
  selectedOutputId: string;
  availableInputs: MediaDeviceInfo[];
  availableOutputs: MediaDeviceInfo[];
}

export interface VocalStudioState {
  isMicActive: boolean;
  micVolume: number;
  backingVolume: number;
  reverbAmount: number;
  echoAmount: number;
  vocalRemoverActive: boolean;
  isRecording: boolean;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  recordingDuration: number;
  pitchMonitorActive: boolean;
  currentPitchHz: number | null;
  currentNote: string | null;
  keyShift: number;
}

export interface LRCLibSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}
