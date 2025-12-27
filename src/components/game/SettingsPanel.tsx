import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, Monitor, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SettingsPanelProps {
  onBack: () => void;
}

export const SettingsPanel = ({ onBack }: SettingsPanelProps) => {
  const [settings, setSettings] = useState({
    musicVolume: 80,
    effectVolume: 100,
    backgroundDim: 50,
    showFps: false,
    cursorSize: 1,
  });

  const updateSetting = (key: string, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <motion.header 
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
      </motion.header>

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Audio Settings */}
        <motion.section
          className="neon-box rounded-xl p-6"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Volume2 className="w-6 h-6 text-primary" />
            <h2 className="font-display text-xl font-bold">Audio</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <Label>Music Volume</Label>
                <span className="text-sm text-muted-foreground">{settings.musicVolume}%</span>
              </div>
              <Slider
                value={[settings.musicVolume]}
                onValueChange={([v]) => updateSetting('musicVolume', v)}
                max={100}
                step={1}
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <Label>Effect Volume</Label>
                <span className="text-sm text-muted-foreground">{settings.effectVolume}%</span>
              </div>
              <Slider
                value={[settings.effectVolume]}
                onValueChange={([v]) => updateSetting('effectVolume', v)}
                max={100}
                step={1}
              />
            </div>
          </div>
        </motion.section>

        {/* Visual Settings */}
        <motion.section
          className="neon-box rounded-xl p-6"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-6 h-6 text-secondary" />
            <h2 className="font-display text-xl font-bold">Visual</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <Label>Background Dim</Label>
                <span className="text-sm text-muted-foreground">{settings.backgroundDim}%</span>
              </div>
              <Slider
                value={[settings.backgroundDim]}
                onValueChange={([v]) => updateSetting('backgroundDim', v)}
                max={100}
                step={5}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Show FPS Counter</Label>
              <Switch
                checked={settings.showFps}
                onCheckedChange={(v) => updateSetting('showFps', v)}
              />
            </div>
          </div>
        </motion.section>

        {/* Gameplay Settings */}
        <motion.section
          className="neon-box rounded-xl p-6"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Sliders className="w-6 h-6 text-accent" />
            <h2 className="font-display text-xl font-bold">Gameplay</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <Label>Cursor Size</Label>
                <span className="text-sm text-muted-foreground">{settings.cursorSize}x</span>
              </div>
              <Slider
                value={[settings.cursorSize]}
                onValueChange={([v]) => updateSetting('cursorSize', v)}
                min={0.5}
                max={2}
                step={0.1}
              />
            </div>
          </div>
        </motion.section>

        {/* Info */}
        <motion.div
          className="text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>Settings are saved automatically</p>
        </motion.div>
      </div>
    </div>
  );
};
