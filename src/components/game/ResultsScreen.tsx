import { motion } from 'framer-motion';
import { Trophy, Target, Zap, XCircle, ArrowLeft, RotateCcw, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GameState, Beatmap } from '@/types/game';

interface ResultsScreenProps {
  state: GameState;
  beatmap: Beatmap;
  mods: string[];
  onBack: () => void;
  onRetry: () => void;
}

export const ResultsScreen = ({ state, beatmap, mods, onBack, onRetry }: ResultsScreenProps) => {
  const getRank = () => {
    if (state.accuracy >= 100) return { grade: 'SS', color: 'text-gold' };
    if (state.accuracy >= 95) return { grade: 'S', color: 'text-gold' };
    if (state.accuracy >= 90) return { grade: 'A', color: 'text-secondary' };
    if (state.accuracy >= 80) return { grade: 'B', color: 'text-accent' };
    if (state.accuracy >= 70) return { grade: 'C', color: 'text-primary' };
    return { grade: 'D', color: 'text-destructive' };
  };

  const rank = getRank();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[150px]" />
      </div>

      <motion.div 
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Song info */}
        <div className="text-center mb-8">
          <motion.h1 
            className="text-3xl font-display font-bold mb-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {beatmap.title}
          </motion.h1>
          <motion.p 
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {beatmap.artist} • {beatmap.version}
          </motion.p>
        </div>

        {/* Rank */}
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        >
          <div className={`text-9xl font-display font-black ${rank.color}`}>
            {rank.grade}
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {[
            { label: 'Score', value: state.score.toLocaleString(), icon: Trophy, color: 'text-gold' },
            { label: 'Accuracy', value: `${state.accuracy.toFixed(2)}%`, icon: Target, color: 'text-secondary' },
            { label: 'Max Combo', value: `${state.maxCombo}x`, icon: Zap, color: 'text-primary' },
            { label: 'Misses', value: state.missCount, icon: XCircle, color: 'text-destructive' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="neon-box rounded-xl p-4 text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className={`text-2xl font-display font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Hit counts */}
        <motion.div 
          className="flex justify-center gap-8 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-secondary">{state.perfectCount}</div>
            <div className="text-xs text-muted-foreground">300</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-green-400">{state.greatCount}</div>
            <div className="text-xs text-muted-foreground">100</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-yellow-400">{state.goodCount}</div>
            <div className="text-xs text-muted-foreground">50</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-destructive">{state.missCount}</div>
            <div className="text-xs text-muted-foreground">Miss</div>
          </div>
        </motion.div>

        {/* Mods used */}
        {mods.length > 0 && (
          <motion.div 
            className="flex justify-center gap-2 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {mods.map(mod => (
              <span key={mod} className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium uppercase">
                {mod}
              </span>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div 
          className="flex justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Button variant="outline" size="lg" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Menu
          </Button>
          <Button variant="hero" size="lg" onClick={onRetry}>
            <RotateCcw className="w-5 h-5 mr-2" />
            Retry
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
