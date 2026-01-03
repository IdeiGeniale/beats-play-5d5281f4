import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Trash2, Calendar, Target, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getScores, deleteScore, clearScores } from '@/lib/scoreStorage';
import { SavedScore, getGradeColor } from '@/types/score';

interface ScoresScreenProps {
  onBack: () => void;
}

export const ScoresScreen = ({ onBack }: ScoresScreenProps) => {
  const [scores, setScores] = useState<SavedScore[]>(getScores());

  const handleDelete = (id: string) => {
    deleteScore(id);
    setScores(getScores());
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all scores?')) {
      clearScores();
      setScores([]);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-gold" />
              <h1 className="text-3xl font-display font-bold">Scores</h1>
            </div>
          </div>
          
          {scores.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </motion.div>

        {/* Scores list */}
        {scores.length === 0 ? (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground text-lg">No scores yet</p>
            <p className="text-muted-foreground/60 text-sm mt-2">Play some beatmaps to see your scores here!</p>
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AnimatePresence mode="popLayout">
              {scores.map((score, index) => (
                <motion.div
                  key={score.id}
                  className="neon-box rounded-xl p-4 hover:bg-muted/30 transition-colors group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <div className="flex items-center gap-4">
                    {/* Grade */}
                    <div className={`text-4xl md:text-5xl font-display font-black ${getGradeColor(score.grade)} min-w-[60px] text-center`}>
                      {score.grade}
                    </div>

                    {/* Song info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{score.beatmapName}</h3>
                      <p className="text-muted-foreground text-sm truncate">
                        {score.artist} • {score.difficulty}
                      </p>
                      {score.mods.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {score.mods.map(mod => (
                            <span key={mod} className="px-2 py-0.5 rounded text-xs bg-primary/20 text-primary uppercase">
                              {mod}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-accent font-semibold">
                          <Star className="w-3 h-3" />
                          <span>{(score.pp ?? 0).toFixed(0)}pp</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Trophy className="w-3 h-3" />
                          <span>{score.score.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-secondary">
                          <Target className="w-3 h-3" />
                          <span>{score.accuracy.toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-primary">
                          <Zap className="w-3 h-3" />
                          <span>{score.maxCombo}x</span>
                        </div>
                      </div>
                    </div>

                    {/* Date & actions */}
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(score.timestamp)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(score.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="flex md:hidden items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs">
                    <span className="text-accent font-semibold">{(score.pp ?? 0).toFixed(0)}pp</span>
                    <span className="text-muted-foreground">{score.score.toLocaleString()}</span>
                    <span className="text-secondary">{score.accuracy.toFixed(2)}%</span>
                    <span className="text-primary">{score.maxCombo}x</span>
                    <span className="text-muted-foreground/60 ml-auto">{formatDate(score.timestamp)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};
