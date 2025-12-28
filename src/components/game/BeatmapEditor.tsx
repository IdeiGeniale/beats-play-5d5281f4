import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Circle, 
  Minus, 
  RotateCw, 
  Save, 
  Trash2,
  Grid,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider as UISlider } from '@/components/ui/slider';
import { Beatmap, HitCircle, Slider as SliderType, Spinner } from '@/types/game';
import { exportOsuFile } from '@/lib/osuParser';
import { audioEngine } from '@/lib/audioEngine';
import { toast } from 'sonner';

interface BeatmapEditorProps {
  onBack: () => void;
}

const PLAYFIELD_WIDTH = 512;
const PLAYFIELD_HEIGHT = 384;

export const BeatmapEditor = ({ onBack }: BeatmapEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  const [beatmap, setBeatmap] = useState<Beatmap>({
    audioFilename: 'audio.mp3',
    audioLeadIn: 0,
    previewTime: -1,
    countdown: 0,
    mode: 0,
    title: 'New Beatmap',
    artist: 'Unknown Artist',
    creator: 'You',
    version: 'Normal',
    hpDrainRate: 5,
    circleSize: 4,
    overallDifficulty: 5,
    approachRate: 5,
    sliderMultiplier: 1.4,
    sliderTickRate: 1,
    comboColors: ['#ff2d95', '#00f0ff', '#8b5cf6', '#ffd700'],
    timingPoints: [{ time: 0, beatLength: 500, meter: 4, sampleSet: 0, sampleIndex: 0, volume: 100, uninherited: true, effects: 0 }],
    hitObjects: [],
  });
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'circle' | 'slider' | 'spinner' | 'select'>('circle');
  const [selectedObject, setSelectedObject] = useState<number | null>(null);
  const [beatSnap, setBeatSnap] = useState(4);
  const [bpm, setBpm] = useState(120);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [sliderPoints, setSliderPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingSlider, setIsDrawingSlider] = useState(false);

  // Update BPM in timing points
  useEffect(() => {
    setBeatmap(prev => ({
      ...prev,
      timingPoints: prev.timingPoints.map((tp, i) => 
        i === 0 ? { ...tp, beatLength: 60000 / bpm } : tp
      ),
    }));
  }, [bpm]);

  // Handle audio loading
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await audioEngine.loadAudioFromFile(file);
      setBeatmap(prev => ({ ...prev, audioFilename: file.name }));
      setAudioLoaded(true);
      toast.success('Audio loaded!');
    } catch (err) {
      toast.error('Failed to load audio');
    }
    e.target.value = '';
  };

  // Playback controls
  const togglePlayback = () => {
    if (!audioLoaded) {
      toast.error('Load an audio file first');
      return;
    }
    
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play(currentTime);
    }
    setIsPlaying(!isPlaying);
  };

  // Update current time during playback
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentTime(audioEngine.getCurrentTime());
    }, 16);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Snap time to beat
  const snapToBeat = useCallback((time: number) => {
    const beatLength = 60000 / bpm;
    const snapLength = beatLength / beatSnap;
    return Math.round(time / snapLength) * snapLength;
  }, [bpm, beatSnap]);

  // Handle canvas interaction at coordinates
  const handleCanvasAt = useCallback((x: number, y: number) => {
    if (selectedTool === 'select') {
      const clickedIndex = beatmap.hitObjects.findIndex(obj => {
        const dx = obj.x - x;
        const dy = obj.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 30;
      });
      setSelectedObject(clickedIndex >= 0 ? clickedIndex : null);
      return;
    }
    
    if (selectedTool === 'slider') {
      if (!isDrawingSlider) {
        setSliderPoints([{ x, y }]);
        setIsDrawingSlider(true);
      } else {
        setSliderPoints(prev => [...prev, { x, y }]);
      }
      return;
    }
    
    const time = snapToBeat(currentTime);
    const comboNumber = beatmap.hitObjects.filter(o => o.time < time).length % 10 + 1;
    
    if (selectedTool === 'circle') {
      const newCircle: HitCircle = {
        type: 'circle',
        x,
        y,
        time,
        comboNumber,
        comboColor: 0,
      };
      
      setBeatmap(prev => ({
        ...prev,
        hitObjects: [...prev.hitObjects, newCircle].sort((a, b) => a.time - b.time),
      }));
      
      toast.success('Circle added');
    } else if (selectedTool === 'spinner') {
      const newSpinner: Spinner = {
        type: 'spinner',
        x: PLAYFIELD_WIDTH / 2,
        y: PLAYFIELD_HEIGHT / 2,
        time,
        endTime: time + 2000,
        comboNumber: 1,
        comboColor: 0,
      };
      
      setBeatmap(prev => ({
        ...prev,
        hitObjects: [...prev.hitObjects, newSpinner].sort((a, b) => a.time - b.time),
      }));
      
      toast.success('Spinner added');
    }
  }, [selectedTool, isDrawingSlider, snapToBeat, currentTime, beatmap.hitObjects]);

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = PLAYFIELD_WIDTH / rect.width;
    const scaleY = PLAYFIELD_HEIGHT / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    handleCanvasAt(x, y);
  };

  // Handle touch for mobile
  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = PLAYFIELD_WIDTH / rect.width;
    const scaleY = PLAYFIELD_HEIGHT / rect.height;
    const x = Math.round((touch.clientX - rect.left) * scaleX);
    const y = Math.round((touch.clientY - rect.top) * scaleY);
    
    handleCanvasAt(x, y);
  };

  // Finish slider
  const finishSlider = () => {
    if (sliderPoints.length < 2) {
      setIsDrawingSlider(false);
      setSliderPoints([]);
      return;
    }
    
    const time = snapToBeat(currentTime);
    const comboNumber = beatmap.hitObjects.filter(o => o.time < time).length % 10 + 1;
    
    const newSlider: SliderType = {
      type: 'slider',
      x: sliderPoints[0].x,
      y: sliderPoints[0].y,
      time,
      curveType: 'B',
      curvePoints: sliderPoints.slice(1),
      slides: 1,
      length: 100,
      comboNumber,
      comboColor: 0,
      duration: 500,
      tickCount: 2,
    };
    
    setBeatmap(prev => ({
      ...prev,
      hitObjects: [...prev.hitObjects, newSlider].sort((a, b) => a.time - b.time),
    }));
    
    setIsDrawingSlider(false);
    setSliderPoints([]);
    toast.success('Slider added');
  };

  // Delete selected object
  const deleteSelected = () => {
    if (selectedObject === null) return;
    
    setBeatmap(prev => ({
      ...prev,
      hitObjects: prev.hitObjects.filter((_, i) => i !== selectedObject),
    }));
    setSelectedObject(null);
    toast.success('Object deleted');
  };

  // Export beatmap
  const handleExport = () => {
    const content = exportOsuFile(beatmap);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${beatmap.artist} - ${beatmap.title} (${beatmap.creator}) [${beatmap.version}].osu`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Beatmap exported!');
  };

  // Draw editor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= PLAYFIELD_WIDTH; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PLAYFIELD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= PLAYFIELD_HEIGHT; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(PLAYFIELD_WIDTH, y);
      ctx.stroke();
    }
    
    // Draw hit objects
    for (let i = 0; i < beatmap.hitObjects.length; i++) {
      const obj = beatmap.hitObjects[i];
      const isSelected = i === selectedObject;
      const color = beatmap.comboColors[obj.comboColor % beatmap.comboColors.length];
      
      // Only draw objects near current time
      const timeDiff = obj.time - currentTime;
      if (Math.abs(timeDiff) > 5000) continue;
      
      const alpha = Math.max(0.3, 1 - Math.abs(timeDiff) / 2000);
      ctx.globalAlpha = alpha;
      
      if (obj.type === 'circle') {
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.comboNumber.toString(), obj.x, obj.y);
      } else if (obj.type === 'slider') {
        const slider = obj as SliderType;
        ctx.beginPath();
        ctx.moveTo(slider.x, slider.y);
        for (const p of slider.curvePoints) {
          ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 50;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(slider.x, slider.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.stroke();
      } else if (obj.type === 'spinner') {
        ctx.beginPath();
        ctx.arc(PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, 80, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#ffffff' : '#8b5cf6';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.fillStyle = '#8b5cf6';
        ctx.font = 'bold 14px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText('SPIN', PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2);
      }
    }
    
    // Draw slider being drawn
    if (isDrawingSlider && sliderPoints.length > 0) {
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(sliderPoints[0].x, sliderPoints[0].y);
      for (const p of sliderPoints.slice(1)) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 50;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      for (const p of sliderPoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
    
    ctx.globalAlpha = 1;
  }, [beatmap, currentTime, selectedObject, sliderPoints, isDrawingSlider]);

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-2 sm:gap-4 p-2 sm:p-4 border-b border-border/50 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg sm:text-2xl font-bold truncate">Beatmap Editor</h1>
        
        <div className="flex-1" />
        
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioUpload}
        />
        <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => audioInputRef.current?.click()}>
          <Music className="w-4 h-4 mr-2" />
          {audioLoaded ? 'Change Audio' : 'Load Audio'}
        </Button>
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => audioInputRef.current?.click()}>
          <Music className="w-5 h-5" />
        </Button>
        
        <Button variant="neon" size="sm" className="hidden sm:flex" onClick={handleExport}>
          <Save className="w-4 h-4 mr-2" />
          Export .osu
        </Button>
        <Button variant="neon" size="icon" className="sm:hidden" onClick={handleExport}>
          <Save className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile toolbar - horizontal */}
        <div className="lg:hidden flex items-center gap-1 p-2 border-b border-border/30 flex-shrink-0 overflow-x-auto">
          <Button
            variant={selectedTool === 'select' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('select')}
          >
            <Grid className="w-4 h-4 mr-1" />
            Select
          </Button>
          <Button
            variant={selectedTool === 'circle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('circle')}
          >
            <Circle className="w-4 h-4 mr-1" />
            Circle
          </Button>
          <Button
            variant={selectedTool === 'slider' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('slider')}
          >
            <Minus className="w-4 h-4 mr-1" />
            Slider
          </Button>
          <Button
            variant={selectedTool === 'spinner' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTool('spinner')}
          >
            <RotateCw className="w-4 h-4 mr-1" />
            Spinner
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteSelected}
            disabled={selectedObject === null}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Desktop toolbar - vertical */}
        <div className="hidden lg:flex w-16 border-r border-border/30 p-2 flex-col gap-2 flex-shrink-0">
          <Button
            variant={selectedTool === 'select' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setSelectedTool('select')}
            title="Select"
          >
            <Grid className="w-5 h-5" />
          </Button>
          <Button
            variant={selectedTool === 'circle' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setSelectedTool('circle')}
            title="Circle"
          >
            <Circle className="w-5 h-5" />
          </Button>
          <Button
            variant={selectedTool === 'slider' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setSelectedTool('slider')}
            title="Slider"
          >
            <Minus className="w-5 h-5" />
          </Button>
          <Button
            variant={selectedTool === 'spinner' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setSelectedTool('spinner')}
            title="Spinner"
          >
            <RotateCw className="w-5 h-5" />
          </Button>
          
          <div className="flex-1" />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteSelected}
            disabled={selectedObject === null}
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Main editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas - responsive sizing */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-muted/20 overflow-auto">
            <div 
              className="relative w-full max-w-[512px] aspect-[512/384]"
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              <canvas
                ref={canvasRef}
                width={PLAYFIELD_WIDTH}
                height={PLAYFIELD_HEIGHT}
                className="w-full h-full border border-border rounded-lg cursor-crosshair touch-none"
                onClick={handleCanvasClick}
                onDoubleClick={isDrawingSlider ? finishSlider : undefined}
                onTouchStart={handleCanvasTouch}
              />
              {isDrawingSlider && (
                <div className="absolute top-2 left-2 bg-secondary/90 text-secondary-foreground px-2 py-1 rounded text-xs sm:text-sm">
                  Click to add points, double-click to finish
                </div>
              )}
            </div>
          </div>

          {/* Timeline - responsive */}
          <div className="h-auto min-h-[100px] sm:h-32 border-t border-border/30 p-2 sm:p-4 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4 flex-wrap">
              <Button variant="ghost" size="icon" onClick={togglePlayback}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              
              <span className="font-mono text-xs sm:text-sm">
                {Math.floor(currentTime / 60000)}:{Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')}
              </span>
              
              <UISlider
                className="flex-1 min-w-[100px]"
                value={[currentTime]}
                onValueChange={([v]) => {
                  setCurrentTime(v);
                  if (!isPlaying) {
                    audioEngine.seekTo(v);
                  }
                }}
                max={audioLoaded ? audioEngine.getDuration() : 300000}
                step={1}
              />
              
              <div className="flex items-center gap-1 sm:gap-2">
                <Label className="text-xs hidden sm:inline">BPM:</Label>
                <Input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value) || 120)}
                  className="w-16 sm:w-20 h-8 text-xs"
                />
              </div>
              
              <div className="flex items-center gap-1 sm:gap-2">
                <Label className="text-xs hidden sm:inline">Snap:</Label>
                <select
                  value={beatSnap}
                  onChange={(e) => setBeatSnap(Number(e.target.value))}
                  className="h-8 px-2 rounded bg-muted border border-border text-xs sm:text-sm"
                >
                  <option value={1}>1/1</option>
                  <option value={2}>1/2</option>
                  <option value={4}>1/4</option>
                  <option value={8}>1/8</option>
                  <option value={16}>1/16</option>
                </select>
              </div>
            </div>

            {/* Object timeline */}
            <div 
              ref={timelineRef}
              className="relative h-8 sm:h-12 bg-muted rounded overflow-hidden"
            >
              {beatmap.hitObjects.map((obj, i) => {
                const duration = audioLoaded ? audioEngine.getDuration() : 300000;
                const left = (obj.time / duration) * 100;
                return (
                  <div
                    key={i}
                    className={`absolute top-1/2 -translate-y-1/2 w-1.5 sm:w-2 h-6 sm:h-8 rounded cursor-pointer transition-colors ${
                      i === selectedObject ? 'bg-primary' : 'bg-secondary'
                    }`}
                    style={{ left: `${left}%` }}
                    onClick={() => setSelectedObject(i)}
                  />
                );
              })}
              
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary"
                style={{ 
                  left: `${(currentTime / (audioLoaded ? audioEngine.getDuration() : 300000)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Properties panel - collapsible on mobile */}
        <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-border/30 p-3 sm:p-4 space-y-3 sm:space-y-4 flex-shrink-0 max-h-[200px] lg:max-h-none overflow-y-auto">
          <h3 className="font-display font-bold text-sm sm:text-base">Beatmap Info</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={beatmap.title}
                onChange={(e) => setBeatmap(prev => ({ ...prev, title: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Artist</Label>
              <Input
                value={beatmap.artist}
                onChange={(e) => setBeatmap(prev => ({ ...prev, artist: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2 lg:col-span-1">
              <Label className="text-xs">Difficulty</Label>
              <Input
                value={beatmap.version}
                onChange={(e) => setBeatmap(prev => ({ ...prev, version: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          
          <div className="pt-2 sm:pt-4 border-t border-border/30 hidden lg:block">
            <h3 className="font-display font-bold mb-3 text-sm">Difficulty Settings</h3>
            
            {[
              { key: 'circleSize', label: 'Circle Size' },
              { key: 'approachRate', label: 'Approach Rate' },
              { key: 'overallDifficulty', label: 'Overall Difficulty' },
              { key: 'hpDrainRate', label: 'HP Drain' },
            ].map(({ key, label }) => (
              <div key={key} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{label}</span>
                  <span>{(beatmap as any)[key]}</span>
                </div>
                <UISlider
                  value={[(beatmap as any)[key]]}
                  onValueChange={([v]) => setBeatmap(prev => ({ ...prev, [key]: v }))}
                  min={0}
                  max={10}
                  step={0.1}
                />
              </div>
            ))}
          </div>
          
          <div className="pt-2 sm:pt-4 border-t border-border/30">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Objects: {beatmap.hitObjects.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
