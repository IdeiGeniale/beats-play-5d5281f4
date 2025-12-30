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

export const getGrade = (accuracy: number, missCount: number): Grade => {
  if (accuracy >= 100 && missCount === 0) return 'SS';
  if (accuracy >= 95) return 'S';
  if (accuracy >= 90) return 'A';
  if (accuracy >= 80) return 'B';
  if (accuracy >= 70) return 'C';
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
