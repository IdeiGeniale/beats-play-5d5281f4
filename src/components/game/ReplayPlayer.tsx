import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Beatmap, HitCircle, Slider, Spinner, Replay, ReplayFrame } from '@/types/game';
import { audioEngine } from '@/lib/audioEngine';

interface ReplayPlayerProps {
  beatmap: Beatmap;
  replay: Replay;
  onBack: () => void;
}

const PLAYFIELD_WIDTH = 512;
const PLAYFIELD_HEIGHT = 384;

export const ReplayPlayer = ({ beatmap, replay, onBack }: ReplayPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 256, y: 192 });

  const comboColors = useMemo(() => beatmap.comboColors, [beatmap.comboColors]);
  
  // Calculate approach time and radius from beatmap
  const approachTime = useMemo(() => {
    const ar = beatmap.approachRate;
    if (ar < 5) return 1800 - ar * 120;
    return 1200 - (ar - 5) * 150;
  }, [beatmap.approachRate]);

  const circleRadius = useMemo(() => 54.4 - 4.48 * beatmap.circleSize, [beatmap.circleSize]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      
      const scaleX = containerWidth / PLAYFIELD_WIDTH;
      const scaleY = containerHeight / PLAYFIELD_HEIGHT;
      const newScale = Math.min(scaleX, scaleY) * 0.9;
      
      setScale(newScale);
      setOffset({
        x: (containerWidth - PLAYFIELD_WIDTH * newScale) / 2,
        y: (containerHeight - PLAYFIELD_HEIGHT * newScale) / 2,
      });
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const startReplay = useCallback(() => {
    setIsPlaying(true);
    setIsPaused(false);
    audioEngine.play(0);
  }, []);

  useEffect(() => {
    // Auto-start after a brief delay
    const timer = setTimeout(startReplay, 500);
    return () => {
      clearTimeout(timer);
      audioEngine.stop();
    };
  }, [startReplay]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      if (!isPaused && isPlaying) {
        const time = audioEngine.getCurrentTime();
        setCurrentTime(time);
        
        // Find current cursor position from replay
        const frame = findFrameAtTime(replay.frames, time);
        if (frame) {
          setCursorPos({ x: frame.x, y: frame.y });
        }
      }
      
      drawGame(ctx);
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPaused, isPlaying, replay.frames]);

  const findFrameAtTime = (frames: ReplayFrame[], time: number): ReplayFrame | null => {
    if (frames.length === 0) return null;
    
    for (let i = frames.length - 1; i >= 0; i--) {
      if (frames[i].time <= time) return frames[i];
    }
    return frames[0];
  };

  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

    // Draw hit objects
    const objectCount = beatmap.hitObjects.length;
    
    for (let i = objectCount - 1; i >= 0; i--) {
      const obj = beatmap.hitObjects[i];
      const timeUntilHit = obj.time - currentTime;
      
      if (timeUntilHit > approachTime || timeUntilHit < -300) continue;
      
      const approachProgress = Math.max(0, Math.min(1, 1 - timeUntilHit / approachTime));
      const comboColor = comboColors[obj.comboColor % comboColors.length];
      
      if (obj.type === 'circle') {
        drawHitCircle(ctx, obj as HitCircle, circleRadius, approachProgress, comboColor);
      } else if (obj.type === 'slider') {
        drawSlider(ctx, obj as Slider, circleRadius, approachProgress, comboColor);
      } else if (obj.type === 'spinner') {
        drawSpinner(ctx, obj as Spinner, currentTime);
      }
    }

    // Draw replay cursor
    ctx.beginPath();
    ctx.arc(cursorPos.x, cursorPos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }, [beatmap.hitObjects, comboColors, scale, offset, currentTime, cursorPos, approachTime, circleRadius]);

  const drawHitCircle = (ctx: CanvasRenderingContext2D, circle: HitCircle, radius: number, approach: number, color: string) => {
    const alpha = Math.min(1, approach * 2);
    
    if (approach < 1) {
      const approachRadius = radius + (radius * 2) * (1 - approach);
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, approachRadius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${radius * 0.8}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(circle.comboNumber.toString(), circle.x, circle.y);
    
    ctx.globalAlpha = 1;
  };

  const drawSlider = (ctx: CanvasRenderingContext2D, slider: Slider, radius: number, approach: number, color: string) => {
    const alpha = Math.min(1, approach * 2);
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(slider.x, slider.y);
    for (const point of slider.curvePoints) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha * 0.5;
    ctx.stroke();
    
    ctx.globalAlpha = alpha;
    drawHitCircle(ctx, {
      type: 'circle',
      x: slider.x,
      y: slider.y,
      time: slider.time,
      comboNumber: slider.comboNumber,
      comboColor: slider.comboColor,
    }, radius, approach, color);

    ctx.globalAlpha = 1;
  };

  const drawSpinner = (ctx: CanvasRenderingContext2D, spinner: Spinner, time: number) => {
    if (time < spinner.time || time > spinner.endTime) return;
    
    const centerX = PLAYFIELD_WIDTH / 2;
    const centerY = PLAYFIELD_HEIGHT / 2;
    const maxRadius = Math.min(PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) * 0.4;
    const progress = (time - spinner.time) / (spinner.endTime - spinner.time);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 8;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 8;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${0.5 + progress * 0.5})`;
    ctx.fill();
  };

  const togglePause = () => {
    if (isPaused) {
      audioEngine.resume();
    } else {
      audioEngine.pause();
    }
    setIsPaused(!isPaused);
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-background overflow-hidden">
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="neon-box rounded-lg px-4 py-2">
          <div className="text-xl font-display font-bold text-primary">REPLAY</div>
          <div className="text-sm text-muted-foreground">
            {replay.playerName} • {replay.accuracy.toFixed(2)}%
          </div>
        </div>
        
        <div className="neon-box rounded-lg px-4 py-2">
          <div className="text-2xl font-display font-bold text-gradient-gold">
            {replay.score.toLocaleString()}
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={PLAYFIELD_WIDTH * scale + offset.x * 2}
        height={PLAYFIELD_HEIGHT * scale + offset.y * 2}
        className="absolute inset-0 w-full h-full"
      />

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-background/90 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-4xl font-display font-bold">PAUSED</h2>
              <div className="flex gap-4">
                <Button variant="hero" size="lg" onClick={togglePause}>
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
                <Button variant="outline" size="lg" onClick={onBack}>
                  Exit
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <Button
        variant="glass"
        size="icon"
        className="absolute bottom-4 right-4 z-10"
        onClick={togglePause}
      >
        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
      </Button>
    </div>
  );
};
