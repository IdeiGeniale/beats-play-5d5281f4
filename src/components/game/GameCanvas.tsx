import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Beatmap, HitCircle, Slider, Spinner, GameState, HitJudgement } from '@/types/game';
import { gameEngine } from '@/lib/gameEngine';
import { audioEngine } from '@/lib/audioEngine';

interface GameCanvasProps {
  beatmap: Beatmap;
  mods: string[];
  onGameEnd: (state: GameState) => void;
  onBack: () => void;
}

// osu! playfield is 512x384, we scale to fit
const PLAYFIELD_WIDTH = 512;
const PLAYFIELD_HEIGHT = 384;

export const GameCanvas = ({ beatmap, mods, onGameEnd, onBack }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastRenderTimeRef = useRef<number>(0);
  const judgementsRef = useRef<HitJudgement[]>([]);
  const gameStateRef = useRef<GameState | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [isMobile] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Memoize combo colors for performance
  const comboColors = useMemo(() => beatmap.comboColors, [beatmap.comboColors]);

  // Calculate canvas scale to fit container
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

  // Initialize game
  useEffect(() => {
    gameEngine.loadBeatmap(beatmap);
    gameEngine.setMods(mods);
    
    gameEngine.onStateUpdate = (state) => {
      gameStateRef.current = state;
      setGameState(state);
    };
    gameEngine.onJudgement = (judgement) => {
      judgementsRef.current = [...judgementsRef.current.slice(-10), judgement];
    };
    gameEngine.onGameEnd = (state) => onGameEnd(state);
    gameEngine.onFail = () => {
      setIsPaused(true);
    };

    // Countdown
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setShowCountdown(false);
        gameEngine.start();
      }
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      gameEngine.stop();
    };
  }, [beatmap, mods, onGameEnd]);

  // Game loop with throttled rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Target 60fps but allow higher on capable devices
    const targetFps = 60;
    const frameInterval = 1000 / targetFps;

    const render = (timestamp: number) => {
      const elapsed = timestamp - lastRenderTimeRef.current;
      
      if (elapsed >= frameInterval) {
        lastRenderTimeRef.current = timestamp - (elapsed % frameInterval);
        
        if (!isPaused && !showCountdown) {
          gameEngine.update();
        }
        
        drawGame(ctx);
      }
      
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, showCountdown, scale, offset]);

  const drawGame = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = ctx.canvas;
    
    // Clear with background color for better performance (no alpha)
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw playfield background
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Playfield background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);

    // Check for break period
    const currentTime = gameEngine.getCurrentTime();
    const breaks = gameEngine.getBreaks();
    const inBreak = breaks.some(b => currentTime >= b.startTime && currentTime <= b.endTime);
    
    // Draw break indicator
    if (inBreak) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT);
      
      ctx.font = 'bold 32px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.7;
      ctx.fillText('BREAK', PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2);
      ctx.globalAlpha = 1;
    }

    // Draw hit objects
    const approachTime = gameEngine.getApproachTime();
    const circleRadius = gameEngine.getCircleRadius();
    const processedObjects = gameEngine.getProcessedObjects();
    const activeSliders = gameEngine.getActiveSliders();
    const activeSpinners = gameEngine.getActiveSpinners();

    // Cache beatmap objects length
    const hitObjects = beatmap.hitObjects;
    const objectCount = hitObjects.length;
    
    // Draw objects in reverse order (oldest first = bottom, newest on top)
    for (let i = objectCount - 1; i >= 0; i--) {
      const obj = hitObjects[i];
      
      if (processedObjects.has(i)) continue;
      
      // Keep circles briefly after their hit time, but keep sliders/spinners visible through their full duration.
      const timeUntilHit = obj.time - currentTime;

      // Skip objects that are too early
      if (timeUntilHit > approachTime) continue;

      // Skip objects that are too late (type-specific)
      if (obj.type === 'circle') {
        if (timeUntilHit < -300) continue;
      } else if (obj.type === 'slider') {
        const slider = obj as Slider;
        const sliderEnd = slider.time + slider.duration;
        if (currentTime > sliderEnd + 300 && !activeSliders.has(i)) continue;
      } else if (obj.type === 'spinner') {
        const spinner = obj as Spinner;
        if (currentTime > spinner.endTime + 300 && !activeSpinners.has(i)) continue;
      }
      
      const approachProgress = Math.max(0, Math.min(1, 1 - timeUntilHit / approachTime));
      const comboColor = comboColors[obj.comboColor % comboColors.length];
      
      if (obj.type === 'circle') {
        drawHitCircle(ctx, obj as HitCircle, circleRadius, approachProgress, comboColor);
      } else if (obj.type === 'slider') {
        const activeSlider = activeSliders.get(i);
        drawSlider(ctx, obj as Slider, circleRadius, approachProgress, comboColor, activeSlider?.progress || 0);
      } else if (obj.type === 'spinner') {
        const activeSpinner = activeSpinners.get(i);
        drawSpinner(ctx, obj as Spinner, currentTime, activeSpinner?.spinsCompleted || 0, activeSpinner?.requiredSpins || 1);
      }
    }

    ctx.restore();

    // Draw judgements from ref (avoid state updates during render)
    drawJudgements(ctx);
  }, [beatmap.hitObjects, comboColors, scale, offset]);

  const drawHitCircle = (
    ctx: CanvasRenderingContext2D, 
    circle: HitCircle, 
    radius: number, 
    approach: number,
    color: string
  ) => {
    const alpha = Math.min(1, approach * 2);
    
    // Approach circle
    if (approach < 1) {
      const approachRadius = radius + (radius * 2) * (1 - approach);
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, approachRadius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Hit circle body
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, radius, 0, Math.PI * 2);
    
    const gradient = ctx.createRadialGradient(
      circle.x - radius * 0.3, circle.y - radius * 0.3, 0,
      circle.x, circle.y, radius
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -30));
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Combo number
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${radius * 0.8}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(circle.comboNumber.toString(), circle.x, circle.y);
    
    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    ctx.globalAlpha = 1;
  };

  const drawSlider = (
    ctx: CanvasRenderingContext2D,
    slider: Slider,
    radius: number,
    approach: number,
    color: string,
    progress: number
  ) => {
    const alpha = Math.min(1, approach * 2);
    ctx.globalAlpha = alpha;

    // Draw slider body
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
    
    // Slider border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = radius * 2 + 4;
    ctx.globalAlpha = alpha * 0.3;
    ctx.stroke();
    
    ctx.globalAlpha = alpha;

    // Draw reverse arrows if slides > 1
    if (slider.slides > 1) {
      const endPoint = slider.curvePoints.length > 0 
        ? slider.curvePoints[slider.curvePoints.length - 1] 
        : { x: slider.x, y: slider.y };
      
      // Draw reverse arrow at end
      drawReverseArrow(ctx, endPoint.x, endPoint.y, slider.x, slider.y, radius, color, alpha);
      
      // Draw reverse arrow at start if slides > 2
      if (slider.slides > 2) {
        drawReverseArrow(ctx, slider.x, slider.y, endPoint.x, endPoint.y, radius, color, alpha);
      }
    }

    // Slider ball (if active)
    if (progress > 0) {
      const ballPos = getSliderPosition(slider, progress);
      ctx.beginPath();
      ctx.arc(ballPos.x, ballPos.y, radius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Add glow to slider ball
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw end circle
    if (slider.curvePoints.length > 0) {
      const endPoint = slider.curvePoints[slider.curvePoints.length - 1];
      ctx.beginPath();
      ctx.arc(endPoint.x, endPoint.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = alpha * 0.6;
      ctx.stroke();
    }

    ctx.globalAlpha = alpha;

    // Start circle
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

  const drawReverseArrow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fromX: number,
    fromY: number,
    radius: number,
    color: string,
    alpha: number
  ) => {
    const angle = Math.atan2(fromY - y, fromX - x);
    const arrowSize = radius * 0.6;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    // Draw arrow shape
    ctx.beginPath();
    ctx.moveTo(arrowSize, 0);
    ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.6);
    ctx.lineTo(-arrowSize * 0.2, 0);
    ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  };

  const getSliderPosition = (slider: Slider, progress: number) => {
    const slideNumber = Math.floor(progress * slider.slides);
    let t = (progress * slider.slides) % 1;
    if (slideNumber % 2 === 1) t = 1 - t;

    const allPoints = [{ x: slider.x, y: slider.y }, ...slider.curvePoints];
    const totalPoints = allPoints.length;
    if (totalPoints < 2) return { x: slider.x, y: slider.y };
    
    const index = Math.min(Math.floor(t * (totalPoints - 1)), totalPoints - 2);
    const localT = (t * (totalPoints - 1)) % 1;

    return {
      x: allPoints[index].x + (allPoints[index + 1].x - allPoints[index].x) * localT,
      y: allPoints[index].y + (allPoints[index + 1].y - allPoints[index].y) * localT,
    };
  };

  const drawSpinner = (
    ctx: CanvasRenderingContext2D,
    spinner: Spinner,
    currentTime: number,
    spinsCompleted: number,
    requiredSpins: number
  ) => {
    const progress = Math.min(1, (currentTime - spinner.time) / (spinner.endTime - spinner.time));
    const completion = Math.min(1, spinsCompleted / requiredSpins);
    
    const centerX = PLAYFIELD_WIDTH / 2;
    const centerY = PLAYFIELD_HEIGHT / 2;
    const maxRadius = Math.min(PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT) * 0.4;
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Progress ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, -Math.PI / 2, -Math.PI / 2 + completion * Math.PI * 2);
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 8;
    ctx.stroke();
    
    // Inner spinning element
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(spinsCompleted * Math.PI * 2);
    
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(maxRadius * 0.6, 0);
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.3 + completion * 0.7})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 + completion * 20, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${0.5 + completion * 0.5})`;
    ctx.fill();
    
    // Spin count text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.floor(spinsCompleted)}`, centerX, centerY);
  };

  const drawJudgements = (ctx: CanvasRenderingContext2D) => {
    const now = Date.now();
    const judgements = judgementsRef.current;
    
    for (let i = 0; i < judgements.length; i++) {
      const judgement = judgements[i];
      const age = now - judgement.time;
      if (age > 500) continue;
      
      const alpha = 1 - age / 500;
      const y = judgement.y * scale + offset.y - age * 0.1;
      const x = judgement.x * scale + offset.x;
      
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 28px Orbitron';
      ctx.textAlign = 'center';
      
      let text = '';
      let color = '';
      
      switch (judgement.result) {
        case 'perfect':
          text = '300';
          color = '#00f0ff';
          break;
        case 'great':
          text = '100';
          color = '#00ff88';
          break;
        case 'good':
          text = '50';
          color = '#ffaa00';
          break;
        case 'miss':
          text = 'MISS';
          color = '#ff4444';
          break;
      }
      
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }
    ctx.globalAlpha = 1;
  };

  const shadeColor = (color: string, percent: number) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + 
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
  };

  // Use native event listeners for better mobile performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offset.x) / scale,
        y: (clientY - rect.top - offset.y) / scale,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isPaused || showCountdown) return;
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = getCoords(touch.clientX, touch.clientY);
      gameEngine.handleClick(x, y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isPaused || showCountdown) return;
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = getCoords(touch.clientX, touch.clientY);
      gameEngine.handleMouseMove(x, y);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      gameEngine.handleMouseUp();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isPaused || showCountdown || isMobile) return;
      const { x, y } = getCoords(e.clientX, e.clientY);
      gameEngine.handleClick(x, y);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPaused || showCountdown || isMobile) return;
      const { x, y } = getCoords(e.clientX, e.clientY);
      gameEngine.handleMouseMove(x, y);
    };

    const handleMouseUp = () => {
      if (isMobile) return;
      gameEngine.handleMouseUp();
    };

    // Use passive: false for touch events to prevent delay
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPaused, showCountdown, isMobile, scale, offset]);

  const togglePause = () => {
    if (isPaused) {
      gameEngine.resume();
    } else {
      gameEngine.pause();
    }
    setIsPaused(!isPaused);
  };

  const restart = () => {
    gameEngine.stop();
    setCountdown(3);
    setShowCountdown(true);
    judgementsRef.current = [];
    setIsPaused(false);
    
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setShowCountdown(false);
        gameEngine.start();
      }
    }, 1000);
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-background game-canvas overflow-hidden">
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
        {/* Score & Combo */}
        <div className="pointer-events-auto">
          <div className="neon-box rounded-lg px-4 py-2">
            <div className="text-3xl font-display font-bold text-gradient-gold">
              {gameState?.score.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {gameState?.accuracy.toFixed(2) || 100}%
            </div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="h-4 bg-muted rounded-full overflow-hidden border border-border">
            <motion.div 
              className="h-full transition-all duration-100"
              style={{ 
                width: `${gameState?.hp || 100}%`,
                background: (gameState?.hp || 100) > 30 
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)' 
                  : 'linear-gradient(90deg, #ef4444, #f87171)'
              }}
            />
          </div>
        </div>

        {/* Combo */}
        <div className="pointer-events-auto">
          <div className="neon-box rounded-lg px-4 py-2 text-right">
            <div className="text-4xl font-display font-bold neon-text">
              {gameState?.combo || 0}x
            </div>
            <div className="text-sm text-muted-foreground">combo</div>
          </div>
        </div>
      </div>

      {/* Canvas - cursor visible on PC, touch optimized on mobile */}
      <canvas
        ref={canvasRef}
        width={PLAYFIELD_WIDTH * scale + offset.x * 2}
        height={PLAYFIELD_HEIGHT * scale + offset.y * 2}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: isMobile ? 'none' : 'crosshair' }}
      />

      {/* Countdown */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-background/80 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              key={countdown}
              className="text-9xl font-display font-bold neon-text"
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              {countdown > 0 ? countdown : 'GO!'}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && !showCountdown && (
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
                <Button variant="neon" size="lg" onClick={restart}>
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Restart
                </Button>
                <Button variant="outline" size="lg" onClick={onBack}>
                  Quit
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause button */}
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
