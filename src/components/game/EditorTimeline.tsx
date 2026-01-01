import { useRef, useCallback, useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { audioEngine } from '@/lib/audioEngine';
import { Beatmap } from '@/types/game';

interface TimelineSectionProps {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  togglePlayback: () => void;
  audioLoaded: boolean;
  bpm: number;
  setBpm: (bpm: number) => void;
  beatSnap: number;
  setBeatSnap: (snap: number) => void;
  beatmap: Beatmap;
  selectedObject: number | null;
  setSelectedObject: (index: number | null) => void;
}

export const TimelineSection = ({
  currentTime,
  setCurrentTime,
  isPlaying,
  togglePlayback,
  audioLoaded,
  bpm,
  setBpm,
  beatSnap,
  setBeatSnap,
  beatmap,
  selectedObject,
  setSelectedObject,
}: TimelineSectionProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const duration = audioLoaded ? audioEngine.getDuration() : 300000;

  // Calculate position from mouse/touch event
  const getTimeFromEvent = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    return percent * duration;
  }, [duration]);

  // Handle seeking
  const seekTo = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(duration, time));
    setCurrentTime(clampedTime);
    if (!isPlaying) {
      audioEngine.seekTo(clampedTime);
    } else {
      audioEngine.seekTo(clampedTime);
    }
  }, [duration, isPlaying, setCurrentTime]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    seekTo(getTimeFromEvent(e.clientX));
  }, [getTimeFromEvent, seekTo]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    seekTo(getTimeFromEvent(e.touches[0].clientX));
  }, [getTimeFromEvent, seekTo]);

  // Global move/up handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      seekTo(getTimeFromEvent(e.clientX));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      seekTo(getTimeFromEvent(e.touches[0].clientX));
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, getTimeFromEvent, seekTo]);

  const playheadPercent = (currentTime / duration) * 100;

  // Format time display
  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-auto min-h-[100px] sm:h-32 border-t border-border/30 p-2 sm:p-4 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={togglePlayback}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        
        <span className="font-mono text-xs sm:text-sm min-w-[45px]">
          {formatTime(currentTime)}
        </span>

        {/* Draggable timeline track */}
        <div
          ref={trackRef}
          className="flex-1 h-6 sm:h-8 bg-muted rounded-full cursor-pointer relative select-none touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-primary/30 rounded-full pointer-events-none"
            style={{ width: `${playheadPercent}%` }}
          />
          
          {/* Playhead handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full shadow-lg border-2 border-background pointer-events-none transition-transform"
            style={{ 
              left: `${playheadPercent}%`,
              transform: `translateY(-50%) translateX(-50%) ${isDragging ? 'scale(1.2)' : 'scale(1)'}`
            }}
          />
        </div>

        <span className="font-mono text-xs sm:text-sm text-muted-foreground min-w-[45px]">
          {formatTime(duration)}
        </span>
        
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
      <div className="relative h-8 sm:h-12 bg-muted rounded overflow-hidden">
        {beatmap.hitObjects.map((obj, i) => {
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
        
        {/* Playhead line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
          style={{ left: `${playheadPercent}%` }}
        />
      </div>
    </div>
  );
};