import { SavedScore, getGrade } from '@/types/score';
import { GameState, Beatmap, Replay } from '@/types/game';

const SCORES_KEY = 'beats66_scores';
const REPLAYS_KEY = 'beats66_replays';
const MAX_SCORES = 100;
const MAX_REPLAYS = 20;

export const saveScore = (
  state: GameState,
  beatmap: Beatmap,
  mods: string[]
): SavedScore => {
  const totalObjects = beatmap.hitObjects.length;
  const score: SavedScore = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    beatmapName: beatmap.title,
    difficulty: beatmap.version,
    artist: beatmap.artist,
    mods,
    grade: getGrade(state.score, state.maxCombo, totalObjects),
    score: state.score,
    accuracy: state.accuracy,
    maxCombo: state.maxCombo,
    perfectCount: state.perfectCount,
    greatCount: state.greatCount,
    goodCount: state.goodCount,
    missCount: state.missCount,
    timestamp: Date.now(),
  };

  const scores = getScores();
  scores.unshift(score);
  
  // Keep only top scores
  if (scores.length > MAX_SCORES) {
    scores.length = MAX_SCORES;
  }

  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  return score;
};

export const getScores = (): SavedScore[] => {
  try {
    const data = localStorage.getItem(SCORES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const deleteScore = (id: string): void => {
  const scores = getScores().filter(s => s.id !== id);
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
};

export const clearScores = (): void => {
  localStorage.removeItem(SCORES_KEY);
};

// Replay storage
export const saveReplay = (replay: Replay): void => {
  const replays = getReplays();
  replays.unshift(replay);
  
  if (replays.length > MAX_REPLAYS) {
    replays.length = MAX_REPLAYS;
  }

  localStorage.setItem(REPLAYS_KEY, JSON.stringify(replays));
};

export const getReplays = (): Replay[] => {
  try {
    const data = localStorage.getItem(REPLAYS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const getReplayById = (timestamp: number): Replay | undefined => {
  return getReplays().find(r => r.timestamp === timestamp);
};

export const deleteReplay = (timestamp: number): void => {
  const replays = getReplays().filter(r => r.timestamp !== timestamp);
  localStorage.setItem(REPLAYS_KEY, JSON.stringify(replays));
};
