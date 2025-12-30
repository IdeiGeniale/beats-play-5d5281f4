import { motion } from 'framer-motion';
import { Play, Settings, Music, Edit3, Trophy, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { ParticleBackground } from './ParticleBackground';

interface MainMenuProps {
  onPlay: () => void;
  onEditor: () => void;
  onSettings: () => void;
  onScores: () => void;
}

export const MainMenu = ({ onPlay, onEditor, onSettings, onScores }: MainMenuProps) => {
  const menuItems = [
    { icon: Play, label: 'Play', action: onPlay, delay: 0.2 },
    { icon: Trophy, label: 'Scores', action: onScores, delay: 0.3 },
    { icon: Edit3, label: 'Editor', action: onEditor, delay: 0.4 },
    { icon: Settings, label: 'Settings', action: onSettings, delay: 0.5 },
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      <ParticleBackground />
      
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px]" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-16 px-4">
        <Logo />
        
        {/* Menu buttons */}
        <motion.div 
          className="flex flex-col gap-4 w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {menuItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: item.delay, duration: 0.4, ease: "easeOut" }}
            >
              <Button
                variant="menu"
                size="lg"
                onClick={item.action}
                className="group"
              >
                <item.icon className="w-6 h-6 group-hover:text-primary transition-colors" />
                <span className="flex-1 text-left text-lg">{item.label}</span>
                <motion.div 
                  className="w-2 h-2 rounded-full bg-primary/50"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                />
              </Button>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Footer info */}
        <motion.div 
          className="flex flex-col items-center gap-2 text-muted-foreground text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              <span>Load MP3 or .osu files</span>
            </span>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>Track your scores</span>
            </span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/50">
            Press any key or click to continue
          </p>
        </motion.div>
      </div>
      
      {/* Decorative corner elements */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/20" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-secondary/20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-accent/20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/20" />
      
      {/* Version badge */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground/50 font-mono">
        v1.0.0
      </div>
    </div>
  );
};
