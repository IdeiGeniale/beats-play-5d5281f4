// Core game types for Beats66

export type HitObjectType = 'circle' | 'slider' | 'spinner';

export interface Vector2 {
  x: number;
  y: number;
}

export interface HitCircle {
  type: 'circle';
  x: number;
  y: number;
  time: number;
  comboNumber: number;
  comboColor: number;
}

export interface SliderPoint {
  x: number;
  y: number;
}

export interface Slider {
  type: 'slider';
  x: number;
  y: number;
  time: number;
  curveType: 'L' | 'P' | 'B' | 'C'; // Linear, Perfect, Bezier, Catmull
  curvePoints: SliderPoint[];
  slides: number; // repeat count
  length: number;
  comboNumber: number;
  comboColor: number;
  duration: number;
  tickCount: number;
}

export interface Spinner {
  type: 'spinner';
  x: number;
  y: number;
  time: number;
  endTime: number;
  comboNumber: number;
  comboColor: number;
}

export type HitObject = HitCircle | Slider | Spinner;

export interface TimingPoint {
  time: number;
  beatLength: number; // milliseconds per beat (positive = BPM, negative = inherited)
  meter: number;
  sampleSet: number;
  sampleIndex: number;
  volume: number;
  uninherited: boolean;
  effects: number;
}

export interface Beatmap {
  // General
  audioFilename: string;
  audioLeadIn: number;
  previewTime: number;
  countdown: number;
  mode: number;

  // Metadata
  title: string;
  titleUnicode?: string;
  artist: string;
  artistUnicode?: string;
  creator: string;
  version: string;
  source?: string;
  tags?: string[];
  beatmapId?: number;
  beatmapSetId?: number;

  // Difficulty
  hpDrainRate: number;
  circleSize: number;
  overallDifficulty: number;
  approachRate: number;
  sliderMultiplier: number;
  sliderTickRate: number;

  // Colors
  comboColors: string[];

  // Timing
  timingPoints: TimingPoint[];

  // Hit objects
  hitObjects: HitObject[];

  // Audio (loaded separately)
  audioBuffer?: AudioBuffer;
}

export type HitResult = 'perfect' | 'great' | 'good' | 'miss';

export interface HitJudgement {
  time: number;
  result: HitResult;
  x: number;
  y: number;
  hitObject: HitObject;
  points: number;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  hp: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
}

export interface Mod {
  id: string;
  name: string;
  shortName: string;
  description: string;
  multiplier: number;
  icon: string;
}

export const MODS: Mod[] = [
  { id: 'ez', name: 'Easy', shortName: 'EZ', description: 'Larger hit circles, more forgiving HP drain', multiplier: 0.5, icon: '🟢' },
  { id: 'hr', name: 'Hard Rock', shortName: 'HR', description: 'Smaller hit circles, stricter timing', multiplier: 1.06, icon: '🔴' },
  { id: 'dt', name: 'Double Time', shortName: 'DT', description: 'Play at 1.5x speed', multiplier: 1.12, icon: '⏩' },
  { id: 'ht', name: 'Half Time', shortName: 'HT', description: 'Play at 0.75x speed', multiplier: 0.3, icon: '⏪' },
  { id: 'hd', name: 'Hidden', shortName: 'HD', description: 'Hit circles fade out', multiplier: 1.06, icon: '👁️' },
  { id: 'fl', name: 'Flashlight', shortName: 'FL', description: 'Limited field of view', multiplier: 1.12, icon: '🔦' },
];

export interface ReplayFrame {
  time: number;
  x: number;
  y: number;
  keys: number;
}

export interface Replay {
  beatmapHash: string;
  playerName: string;
  mods: string[];
  score: number;
  maxCombo: number;
  accuracy: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  timestamp: number;
  frames: ReplayFrame[];
}

export interface GameSettings {
  musicVolume: number;
  effectVolume: number;
  backgroundDim: number;
  showFps: boolean;
  cursorSize: number;
  activeMods: string[];
}

// Hit windows in milliseconds (OD 5 baseline)
export const HIT_WINDOWS = {
  perfect: 50,  // 300
  great: 100,   // 100
  good: 150,    // 50
};

// Score values
export const SCORE_VALUES = {
  perfect: 300,
  great: 100,
  good: 50,
  miss: 0,
};

// HP changes
export const HP_CHANGES = {
  perfect: 2,
  great: 1,
  good: 0.5,
  miss: -5,
};
