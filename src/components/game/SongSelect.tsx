import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Play, Music, User, Clock, Zap, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Beatmap, MODS, Mod } from '@/types/game';
import { parseOsuFile } from '@/lib/osuParser';
import { audioEngine } from '@/lib/audioEngine';
import { toast } from 'sonner';

interface SongSelectProps {
  onBack: () => void;
  onStartGame: (beatmap: Beatmap, mods: string[]) => void;
}

interface BeatmapEntry {
  beatmap: Beatmap;
  audioFile: File | null;
}

export const SongSelect = ({ onBack, onStartGame }: SongSelectProps) => {
  const [beatmaps, setBeatmaps] = useState<BeatmapEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [activeMods, setActiveMods] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const osuInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const selectedBeatmap = selectedIndex >= 0 ? beatmaps[selectedIndex] : null;

  const handleOsuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsLoading(true);
    
    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const beatmap = parseOsuFile(content);
        setBeatmaps(prev => [...prev, { beatmap, audioFile: null }]);
        toast.success(`Loaded: ${beatmap.title} [${beatmap.version}]`);
      } catch (err) {
        toast.error(`Failed to parse: ${file.name}`);
      }
    }
    
    setIsLoading(false);
    e.target.value = '';
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedIndex < 0) return;

    try {
      await audioEngine.loadAudioFromFile(file);
      setBeatmaps(prev => {
        const updated = [...prev];
        updated[selectedIndex] = { ...updated[selectedIndex], audioFile: file };
        return updated;
      });
      toast.success('Audio loaded successfully!');
    } catch (err) {
      toast.error('Failed to load audio file');
    }
    
    e.target.value = '';
  };

  const toggleMod = (modId: string) => {
    setActiveMods(prev => {
      // Handle conflicting mods
      if (modId === 'dt' && prev.includes('ht')) {
        return [...prev.filter(m => m !== 'ht'), modId];
      }
      if (modId === 'ht' && prev.includes('dt')) {
        return [...prev.filter(m => m !== 'dt'), modId];
      }
      
      if (prev.includes(modId)) {
        return prev.filter(m => m !== modId);
      }
      return [...prev, modId];
    });
  };

  const calculateModMultiplier = () => {
    return activeMods.reduce((mult, modId) => {
      const mod = MODS.find(m => m.id === modId);
      return mult * (mod?.multiplier || 1);
    }, 1);
  };

  const handleStartGame = () => {
    if (!selectedBeatmap) return;
    
    if (!selectedBeatmap.audioFile) {
      toast.error('Please load an audio file first');
      return;
    }
    
    onStartGame(selectedBeatmap.beatmap, activeMods);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <motion.header 
        className="flex items-center gap-4 p-4 border-b border-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-2xl font-bold">Select Song</h1>
        
        <div className="flex-1" />
        
        <input
          ref={osuInputRef}
          type="file"
          accept=".osu"
          multiple
          className="hidden"
          onChange={handleOsuUpload}
        />
        <Button 
          variant="neon" 
          onClick={() => osuInputRef.current?.click()}
          disabled={isLoading}
        >
          <FileText className="w-4 h-4 mr-2" />
          Import .osu
        </Button>
      </motion.header>

      <div className="flex-1 flex overflow-hidden">
        {/* Beatmap list */}
        <motion.div 
          className="w-1/2 p-4 overflow-y-auto border-r border-border/30"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {beatmaps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Music className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg mb-2">No beatmaps loaded</p>
              <p className="text-sm">Import .osu files to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {beatmaps.map((entry, index) => (
                <motion.button
                  key={index}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedIndex === index 
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
                      : 'border-border/30 bg-card/50 hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedIndex(index)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      entry.audioFile ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      <Music className={`w-6 h-6 ${entry.audioFile ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{entry.beatmap.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{entry.beatmap.artist}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-primary font-medium">{entry.beatmap.version}</div>
                      <div className="text-xs text-muted-foreground">{entry.beatmap.hitObjects.length} objects</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Details panel */}
        <motion.div 
          className="w-1/2 p-6 flex flex-col"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {selectedBeatmap ? (
              <motion.div
                key={selectedIndex}
                className="flex-1 flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Beatmap info */}
                <div className="neon-box rounded-xl p-6 mb-6">
                  <h2 className="font-display text-2xl font-bold mb-1 neon-text">
                    {selectedBeatmap.beatmap.title}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-4">{selectedBeatmap.beatmap.artist}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Mapper:</span>
                      <span>{selectedBeatmap.beatmap.creator}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-secondary" />
                      <span className="text-muted-foreground">Difficulty:</span>
                      <span>{selectedBeatmap.beatmap.version}</span>
                    </div>
                  </div>
                  
                  {/* Difficulty stats */}
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[
                      { label: 'CS', value: selectedBeatmap.beatmap.circleSize },
                      { label: 'AR', value: selectedBeatmap.beatmap.approachRate },
                      { label: 'OD', value: selectedBeatmap.beatmap.overallDifficulty },
                      { label: 'HP', value: selectedBeatmap.beatmap.hpDrainRate },
                    ].map(stat => (
                      <div key={stat.label} className="bg-muted/50 rounded-lg p-2 text-center">
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                        <div className="font-bold text-primary">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio upload */}
                {!selectedBeatmap.audioFile && (
                  <div className="mb-6">
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleAudioUpload}
                    />
                    <Button 
                      variant="outline" 
                      className="w-full h-20 border-dashed"
                      onClick={() => audioInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6" />
                        <span>Upload Audio File ({selectedBeatmap.beatmap.audioFilename || 'MP3'})</span>
                      </div>
                    </Button>
                  </div>
                )}

                {/* Mods */}
                <div className="mb-6">
                  <h3 className="font-display text-lg mb-3">Mods</h3>
                  <div className="flex flex-wrap gap-2">
                    {MODS.map(mod => (
                      <Button
                        key={mod.id}
                        variant={activeMods.includes(mod.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleMod(mod.id)}
                        className="gap-1"
                        title={mod.description}
                      >
                        <span>{mod.icon}</span>
                        <span>{mod.shortName}</span>
                      </Button>
                    ))}
                  </div>
                  {activeMods.length > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Score multiplier: {calculateModMultiplier().toFixed(2)}x
                    </p>
                  )}
                </div>

                {/* Play button */}
                <div className="mt-auto">
                  <Button 
                    variant="hero" 
                    size="xl" 
                    className="w-full"
                    onClick={handleStartGame}
                    disabled={!selectedBeatmap.audioFile}
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Start Game
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="flex-1 flex items-center justify-center text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p>Select a beatmap to view details</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
