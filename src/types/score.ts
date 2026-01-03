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
