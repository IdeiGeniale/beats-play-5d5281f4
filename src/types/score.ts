// Score types for Beats66

export type Grade = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface SavedScore {
  id: string;
  beatmapName: string;
  difficulty: string;
  artist: string;
  mods: string[];
  grade: Grade;
  score: number;
  accuracy: number;
  maxCombo: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  pp: number;
  timestamp: number;
}

export const getGrade = (score: number, maxCombo: number, totalObjects: number): Grade => {
  // Estimate max possible score: 300 points per object with perfect combo multiplier
  const baseMaxScore = totalObjects * 300;
  // Combo bonus estimation (simplified)
  const comboBonus = Math.min(maxCombo / Math.max(totalObjects, 1), 1);
  
  // Performance ratio based on score and combo
  const scoreRatio = Math.min(score / Math.max(baseMaxScore, 1), 1);
  const performance = (scoreRatio * 0.7) + (comboBonus * 0.3);
  
  if (performance >= 0.98 && maxCombo >= totalObjects) return 'SS';
  if (performance >= 0.90) return 'S';
  if (performance >= 0.80) return 'A';
  if (performance >= 0.65) return 'B';
  if (performance >= 0.50) return 'C';
  return 'D';
};

export const getGradeColor = (grade: Grade): string => {
  switch (grade) {
    case 'SS': return 'text-gold';
    case 'S': return 'text-gold';
    case 'A': return 'text-secondary';
    case 'B': return 'text-accent';
    case 'C': return 'text-primary';
    case 'D': return 'text-destructive';
  }
};

// Calculate Performance Points (PP)
export const calculatePP = (
  accuracy: number,
  maxCombo: number,
  totalObjects: number,
  missCount: number,
  mods: string[]
): number => {
  // Base PP from object count (difficulty estimation)
  const basePP = Math.pow(totalObjects, 0.8) * 2;
  
  // Accuracy multiplier (exponential scaling)
  const accMultiplier = Math.pow(accuracy / 100, 4);
  
  // Combo multiplier (ratio of achieved combo to max possible)
  const comboRatio = Math.min(maxCombo / Math.max(totalObjects, 1), 1);
  const comboMultiplier = Math.pow(comboRatio, 0.8);
  
  // Miss penalty (each miss reduces PP significantly)
  const missPenalty = Math.pow(0.97, missCount);
  
  // Mod multipliers
  let modMultiplier = 1.0;
  if (mods.includes('HR')) modMultiplier *= 1.1;
  if (mods.includes('DT')) modMultiplier *= 1.12;
  if (mods.includes('HD')) modMultiplier *= 1.06;
  if (mods.includes('FL')) modMultiplier *= 1.12;
  if (mods.includes('EZ')) modMultiplier *= 0.5;
  if (mods.includes('HT')) modMultiplier *= 0.5;
  
  const pp = basePP * accMultiplier * comboMultiplier * missPenalty * modMultiplier;
  
  return Math.round(pp * 100) / 100;
};
