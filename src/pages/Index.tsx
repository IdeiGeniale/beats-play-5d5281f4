import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MainMenu } from '@/components/game/MainMenu';
import { SongSelect } from '@/components/game/SongSelect';
import { GameCanvas } from '@/components/game/GameCanvas';
import { ResultsScreen } from '@/components/game/ResultsScreen';
import { SettingsPanel } from '@/components/game/SettingsPanel';
import { BeatmapEditor } from '@/components/game/BeatmapEditor';
import { ScoresScreen } from '@/components/game/ScoresScreen';
import { ReplayPlayer } from '@/components/game/ReplayPlayer';
import { Beatmap, GameState, Replay } from '@/types/game';
import { saveScore, saveReplay } from '@/lib/scoreStorage';

type GameScreen = 'menu' | 'songSelect' | 'playing' | 'results' | 'settings' | 'editor' | 'scores' | 'replay';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('menu');
  const [selectedBeatmap, setSelectedBeatmap] = useState<Beatmap | null>(null);
  const [activeMods, setActiveMods] = useState<string[]>([]);
  const [gameResults, setGameResults] = useState<GameState | null>(null);
  const [currentReplay, setCurrentReplay] = useState<Replay | null>(null);

  const handleStartGame = (beatmap: Beatmap, mods: string[]) => {
    setSelectedBeatmap(beatmap);
    setActiveMods(mods);
    setCurrentScreen('playing');
  };

  const handleGameEnd = (state: GameState, replay?: Replay) => {
    setGameResults(state);
    if (selectedBeatmap) {
      saveScore(state, selectedBeatmap, activeMods);
      if (replay) {
        saveReplay(replay);
        setCurrentReplay(replay);
      }
    }
    setCurrentScreen('results');
  };

  const handleRetry = () => {
    setCurrentReplay(null);
    setCurrentScreen('playing');
  };

  const handleWatchReplay = () => {
    if (currentReplay && selectedBeatmap) {
      setCurrentScreen('replay');
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <AnimatePresence mode="wait">
        {currentScreen === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MainMenu
              onPlay={() => setCurrentScreen('songSelect')}
              onEditor={() => setCurrentScreen('editor')}
              onSettings={() => setCurrentScreen('settings')}
              onScores={() => setCurrentScreen('scores')}
            />
          </motion.div>
        )}

        {currentScreen === 'songSelect' && (
          <motion.div
            key="songSelect"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <SongSelect
              onBack={() => setCurrentScreen('menu')}
              onStartGame={handleStartGame}
            />
          </motion.div>
        )}

        {currentScreen === 'playing' && selectedBeatmap && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameCanvas
              beatmap={selectedBeatmap}
              mods={activeMods}
              onGameEnd={handleGameEnd}
              onBack={() => setCurrentScreen('songSelect')}
            />
          </motion.div>
        )}

        {currentScreen === 'results' && gameResults && selectedBeatmap && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <ResultsScreen
              state={gameResults}
              beatmap={selectedBeatmap}
              mods={activeMods}
              onBack={() => setCurrentScreen('songSelect')}
              onRetry={handleRetry}
              onWatchReplay={currentReplay ? handleWatchReplay : undefined}
            />
          </motion.div>
        )}

        {currentScreen === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <SettingsPanel onBack={() => setCurrentScreen('menu')} />
          </motion.div>
        )}

        {currentScreen === 'editor' && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <BeatmapEditor onBack={() => setCurrentScreen('menu')} />
          </motion.div>
        )}

        {currentScreen === 'scores' && (
          <motion.div
            key="scores"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
          >
            <ScoresScreen onBack={() => setCurrentScreen('menu')} />
          </motion.div>
        )}

        {currentScreen === 'replay' && selectedBeatmap && currentReplay && (
          <motion.div
            key="replay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ReplayPlayer
              beatmap={selectedBeatmap}
              replay={currentReplay}
              onBack={() => setCurrentScreen('results')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
