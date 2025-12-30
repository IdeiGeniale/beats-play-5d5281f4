import { 
  Beatmap, 
  HitObject, 
  HitCircle, 
  Slider, 
  Spinner,
  GameState, 
  HitJudgement, 
  HitResult,
  HIT_WINDOWS,
  SCORE_VALUES,
  HP_CHANGES,
  ReplayFrame,
  Replay,
  TimingPoint
} from '@/types/game';
import { audioEngine } from './audioEngine';

interface ActiveSlider {
  slider: Slider;
  progress: number;
  ticksHit: number;
  isHeld: boolean;
  startHit: boolean;
}

interface ActiveSpinner {
  spinner: Spinner;
  rotation: number;
  lastAngle: number | null;
  spinsCompleted: number;
  requiredSpins: number;
  isActive: boolean;
}

export class GameEngine {
  private beatmap: Beatmap | null = null;
  private gameState: GameState;
  private judgements: HitJudgement[] = [];
  private activeSliders: Map<number, ActiveSlider> = new Map();
  private activeSpinners: Map<number, ActiveSpinner> = new Map();
  private processedObjects: Set<number> = new Set();
  private currentTime: number = 0;
  private isRunning: boolean = false;
  private mods: Set<string> = new Set();
  private replayFrames: ReplayFrame[] = [];
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private keysPressed: number = 0;
  
  // Callbacks
  public onJudgement: ((judgement: HitJudgement) => void) | null = null;
  public onStateUpdate: ((state: GameState) => void) | null = null;
  public onGameEnd: ((state: GameState, replay: Replay) => void) | null = null;
  public onFail: (() => void) | null = null;

  // Calculated values based on difficulty
  private circleRadius: number = 54;
  private approachTime: number = 800;
  private hitWindows: { perfect: number; great: number; good: number } = { ...HIT_WINDOWS };

  constructor() {
    this.gameState = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      score: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      hp: 100,
      perfectCount: 0,
      greatCount: 0,
      goodCount: 0,
      missCount: 0,
    };
  }

  loadBeatmap(beatmap: Beatmap): void {
    this.beatmap = beatmap;
    this.reset();
    this.calculateDifficultyValues();
  }

  private calculateDifficultyValues(): void {
    if (!this.beatmap) return;

    let cs = this.beatmap.circleSize;
    let ar = this.beatmap.approachRate;
    let od = this.beatmap.overallDifficulty;

    // Apply mods
    if (this.mods.has('ez')) {
      cs *= 0.5;
      ar *= 0.5;
      od *= 0.5;
    }
    if (this.mods.has('hr')) {
      cs = Math.min(10, cs * 1.3);
      ar = Math.min(10, ar * 1.4);
      od = Math.min(10, od * 1.4);
    }

    // Circle radius (osu! formula)
    this.circleRadius = 54.4 - 4.48 * cs;

    // Approach rate timing
    if (ar < 5) {
      this.approachTime = 1800 - ar * 120;
    } else {
      this.approachTime = 1200 - (ar - 5) * 150;
    }

    // Hit windows based on OD
    this.hitWindows = {
      perfect: 80 - 6 * od,
      great: 140 - 8 * od,
      good: 200 - 10 * od,
    };
  }

  setMods(mods: string[]): void {
    this.mods = new Set(mods);
    if (this.beatmap) {
      this.calculateDifficultyValues();
    }
    
    // Adjust playback rate
    if (this.mods.has('dt')) {
      audioEngine.setPlaybackRate(1.5);
    } else if (this.mods.has('ht')) {
      audioEngine.setPlaybackRate(0.75);
    } else {
      audioEngine.setPlaybackRate(1);
    }
  }

  reset(): void {
    this.gameState = this.createInitialState();
    this.judgements = [];
    this.activeSliders.clear();
    this.activeSpinners.clear();
    this.processedObjects.clear();
    this.currentTime = 0;
    this.replayFrames = [];
  }

  start(): void {
    if (!this.beatmap) return;
    this.reset();
    this.isRunning = true;
    audioEngine.play(0);
  }

  stop(): void {
    this.isRunning = false;
    audioEngine.stop();
  }

  pause(): void {
    this.isRunning = false;
    audioEngine.pause();
  }

  resume(): void {
    this.isRunning = true;
    audioEngine.resume();
  }

  update(): void {
    if (!this.isRunning || !this.beatmap) return;

    this.currentTime = audioEngine.getCurrentTime();
    
    // Apply speed mod
    const timeMultiplier = this.mods.has('dt') ? 1.5 : this.mods.has('ht') ? 0.75 : 1;
    
    // Auto-activate spinners when they start
    this.activateSpinners();
    
    // Check for missed objects
    this.checkMissedObjects();
    
    // Update active sliders
    this.updateActiveSliders();
    
    // Update active spinners
    this.updateActiveSpinners();
    
    // Check if in break period - no HP drain during breaks
    const inBreak = this.beatmap.breaks.some(
      b => this.currentTime >= b.startTime && this.currentTime <= b.endTime
    );
    
    // HP drain (not during breaks)
    if (this.gameState.hp > 0 && !inBreak) {
      const drainRate = this.beatmap.hpDrainRate * 0.01 * timeMultiplier;
      if (this.mods.has('ez')) {
        this.gameState.hp -= drainRate * 0.5;
      } else {
        this.gameState.hp -= drainRate;
      }
      
      if (this.gameState.hp <= 0) {
        this.gameState.hp = 0;
        if (this.onFail) {
          this.onFail();
        }
      }
    }
    
    // Check if all objects processed - end game when no more objects
    const allProcessed = this.processedObjects.size >= this.beatmap.hitObjects.length;
    const lastObject = this.beatmap.hitObjects[this.beatmap.hitObjects.length - 1];
    const lastObjectEndTime = lastObject?.type === 'slider' 
      ? (lastObject as Slider).time + (lastObject as Slider).duration
      : lastObject?.type === 'spinner'
        ? (lastObject as Spinner).endTime
        : lastObject?.time || 0;
    
    // End game when all objects done and past the last object
    if (allProcessed && this.currentTime > lastObjectEndTime + 1000) {
      this.endGame();
      return;
    }
    
    // Fallback: check if song ended
    if (this.currentTime >= audioEngine.getDuration()) {
      this.endGame();
    }

    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.gameState });
    }
  }

  private activateSpinners(): void {
    if (!this.beatmap) return;

    for (let i = 0; i < this.beatmap.hitObjects.length; i++) {
      const obj = this.beatmap.hitObjects[i];
      if (obj.type !== 'spinner') continue;
      if (this.processedObjects.has(i)) continue;
      if (this.activeSpinners.has(i)) continue;

      const spinner = obj as Spinner;
      if (this.currentTime >= spinner.time && this.currentTime <= spinner.endTime) {
        this.activeSpinners.set(i, {
          spinner,
          rotation: 0,
          lastAngle: null,
          spinsCompleted: 0,
          requiredSpins: Math.ceil((spinner.endTime - spinner.time) / 1000 * 2.5),
          isActive: true,
        });
      }
    }
  }

  private checkMissedObjects(): void {
    if (!this.beatmap) return;

    for (let i = 0; i < this.beatmap.hitObjects.length; i++) {
      const obj = this.beatmap.hitObjects[i];
      if (this.processedObjects.has(i)) continue;

      const missTime = obj.time + this.hitWindows.good;
      
      if (obj.type === 'circle' && this.currentTime > missTime) {
        this.processHit(i, 'miss', obj);
      } else if (obj.type === 'slider') {
        const slider = obj as Slider;
        const sliderEnd = slider.time + slider.duration;
        if (this.currentTime > sliderEnd + this.hitWindows.good && !this.activeSliders.has(i)) {
          if (!this.processedObjects.has(i)) {
            this.processHit(i, 'miss', obj);
          }
        }
      } else if (obj.type === 'spinner') {
        const spinner = obj as Spinner;
        if (this.currentTime > spinner.endTime && !this.activeSpinners.has(i)) {
          if (!this.processedObjects.has(i)) {
            this.processHit(i, 'miss', obj);
          }
        }
      }
    }
  }

  private updateActiveSliders(): void {
    for (const [index, activeSlider] of this.activeSliders) {
      const slider = activeSlider.slider;
      const elapsed = this.currentTime - slider.time;
      activeSlider.progress = Math.min(1, elapsed / slider.duration);

      // Check slider end
      if (activeSlider.progress >= 1) {
        const result = activeSlider.ticksHit >= slider.tickCount * 0.5 ? 'great' : 'good';
        this.processHit(index, result, slider);
        this.activeSliders.delete(index);
      }
    }
  }

  private updateActiveSpinners(): void {
    for (const [index, activeSpinner] of this.activeSpinners) {
      const spinner = activeSpinner.spinner;
      
      if (this.currentTime >= spinner.endTime) {
        const result = activeSpinner.spinsCompleted >= activeSpinner.requiredSpins 
          ? 'perfect' 
          : activeSpinner.spinsCompleted >= activeSpinner.requiredSpins * 0.5 
            ? 'great' 
            : 'miss';
        this.processHit(index, result, spinner);
        this.activeSpinners.delete(index);
      }
    }
  }

  handleClick(x: number, y: number): void {
    if (!this.isRunning || !this.beatmap) return;

    // Record replay frame
    this.replayFrames.push({
      time: this.currentTime,
      x,
      y,
      keys: 1,
    });

    // Check for hittable objects
    for (let i = 0; i < this.beatmap.hitObjects.length; i++) {
      const obj = this.beatmap.hitObjects[i];
      if (this.processedObjects.has(i)) continue;

      const timeDiff = Math.abs(this.currentTime - obj.time);
      
      if (timeDiff <= this.hitWindows.good) {
        if (obj.type === 'circle') {
          if (this.isPointInCircle(x, y, obj.x, obj.y)) {
            const result = this.getHitResult(timeDiff);
            this.processHit(i, result, obj);
            return;
          }
        } else if (obj.type === 'slider') {
          const slider = obj as Slider;
          if (this.isPointInCircle(x, y, slider.x, slider.y)) {
            const result = this.getHitResult(timeDiff);
            if (result !== 'miss') {
              this.activeSliders.set(i, {
                slider,
                progress: 0,
                ticksHit: 1,
                isHeld: true,
                startHit: true,
              });
              this.addScore(SCORE_VALUES[result] / 3, true);
            }
            return;
          }
        } else if (obj.type === 'spinner') {
          // Spinners auto-activate, but clicking confirms interaction
          const spinner = obj as Spinner;
          if (this.currentTime >= spinner.time && this.currentTime <= spinner.endTime) {
            if (!this.activeSpinners.has(i)) {
              this.activeSpinners.set(i, {
                spinner,
                rotation: 0,
                lastAngle: null,
                spinsCompleted: 0,
                requiredSpins: Math.ceil((spinner.endTime - spinner.time) / 1000 * 2.5),
                isActive: true,
              });
            }
            // Set initial angle on click/tap
            const activeSpinner = this.activeSpinners.get(i);
            if (activeSpinner) {
              activeSpinner.lastAngle = Math.atan2(y - 192, x - 256);
            }
            return;
          }
        }
      }
    }
  }

  handleMouseMove(x: number, y: number): void {
    if (!this.isRunning) return;

    this.lastMousePos = { x, y };

    // Update slider tracking
    for (const [index, activeSlider] of this.activeSliders) {
      if (activeSlider.isHeld) {
        const sliderPos = this.getSliderPosition(activeSlider.slider, activeSlider.progress);
        if (this.isPointInCircle(x, y, sliderPos.x, sliderPos.y, this.circleRadius * 2.5)) {
          // Still tracking
          activeSlider.ticksHit++;
        } else {
          activeSlider.isHeld = false;
        }
      }
    }

    // Update spinner rotation - works for any active spinner
    for (const [index, activeSpinner] of this.activeSpinners) {
      if (activeSpinner.lastAngle === null) {
        // First movement - initialize the angle
        activeSpinner.lastAngle = Math.atan2(y - 192, x - 256);
        continue;
      }
      
      const angle = Math.atan2(y - 192, x - 256);
      let deltaAngle = angle - activeSpinner.lastAngle;
      
      // Normalize angle difference to handle wrap-around
      if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
      if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
      
      // Accumulate rotation (absolute value for spinning in any direction)
      activeSpinner.rotation += Math.abs(deltaAngle);
      activeSpinner.lastAngle = angle;
      
      // Count spins (full rotation = 2*PI)
      const newSpins = activeSpinner.rotation / (2 * Math.PI);
      if (newSpins > activeSpinner.spinsCompleted) {
        const spinsGained = Math.floor(newSpins) - Math.floor(activeSpinner.spinsCompleted);
        activeSpinner.spinsCompleted = newSpins;
        if (spinsGained > 0) {
          this.addScore(100 * spinsGained, false);
        }
      }
    }
  }

  handleMouseUp(): void {
    for (const [index, activeSlider] of this.activeSliders) {
      activeSlider.isHeld = false;
    }
  }

  private isPointInCircle(px: number, py: number, cx: number, cy: number, radius?: number): boolean {
    const r = radius || this.circleRadius;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  }

  private getHitResult(timeDiff: number): HitResult {
    if (timeDiff <= this.hitWindows.perfect) return 'perfect';
    if (timeDiff <= this.hitWindows.great) return 'great';
    if (timeDiff <= this.hitWindows.good) return 'good';
    return 'miss';
  }

  private processHit(objectIndex: number, result: HitResult, hitObject: HitObject): void {
    this.processedObjects.add(objectIndex);

    const points = SCORE_VALUES[result];
    const hpChange = HP_CHANGES[result];

    // Update counts
    switch (result) {
      case 'perfect':
        this.gameState.perfectCount++;
        break;
      case 'great':
        this.gameState.greatCount++;
        break;
      case 'good':
        this.gameState.goodCount++;
        break;
      case 'miss':
        this.gameState.missCount++;
        break;
    }

    // Update combo
    if (result === 'miss') {
      this.gameState.combo = 0;
    } else {
      this.gameState.combo++;
      this.gameState.maxCombo = Math.max(this.gameState.maxCombo, this.gameState.combo);
    }

    // Update score with combo multiplier
    this.addScore(points, result !== 'miss');

    // Update HP
    this.gameState.hp = Math.max(0, Math.min(100, this.gameState.hp + hpChange));

    // Update accuracy
    this.updateAccuracy();

    // Create judgement
    const judgement: HitJudgement = {
      time: this.currentTime,
      result,
      x: hitObject.x,
      y: hitObject.y,
      hitObject,
      points,
    };
    this.judgements.push(judgement);

    if (this.onJudgement) {
      this.onJudgement(judgement);
    }
  }

  private addScore(basePoints: number, applyCombo: boolean): void {
    const comboMultiplier = applyCombo ? Math.max(1, this.gameState.combo) : 1;
    let modMultiplier = 1;
    
    if (this.mods.has('hr')) modMultiplier *= 1.06;
    if (this.mods.has('dt')) modMultiplier *= 1.12;
    if (this.mods.has('ht')) modMultiplier *= 0.3;
    if (this.mods.has('ez')) modMultiplier *= 0.5;
    if (this.mods.has('hd')) modMultiplier *= 1.06;
    if (this.mods.has('fl')) modMultiplier *= 1.12;
    
    this.gameState.score += Math.floor(basePoints * comboMultiplier * modMultiplier);
  }

  private updateAccuracy(): void {
    const total = this.gameState.perfectCount + this.gameState.greatCount + 
                  this.gameState.goodCount + this.gameState.missCount;
    if (total === 0) {
      this.gameState.accuracy = 100;
      return;
    }
    
    const weighted = 
      this.gameState.perfectCount * 300 +
      this.gameState.greatCount * 100 +
      this.gameState.goodCount * 50;
    
    this.gameState.accuracy = (weighted / (total * 300)) * 100;
  }

  private getSliderPosition(slider: Slider, progress: number): { x: number; y: number } {
    // Handle repeats
    const slideNumber = Math.floor(progress * slider.slides);
    let t = (progress * slider.slides) % 1;
    if (slideNumber % 2 === 1) t = 1 - t;

    if (slider.curvePoints.length === 0) {
      return { x: slider.x, y: slider.y };
    }

    // Simple linear interpolation for now
    const allPoints = [{ x: slider.x, y: slider.y }, ...slider.curvePoints];
    const totalPoints = allPoints.length;
    const index = Math.min(Math.floor(t * (totalPoints - 1)), totalPoints - 2);
    const localT = (t * (totalPoints - 1)) % 1;

    return {
      x: allPoints[index].x + (allPoints[index + 1].x - allPoints[index].x) * localT,
      y: allPoints[index].y + (allPoints[index + 1].y - allPoints[index].y) * localT,
    };
  }

  private endGame(): void {
    this.isRunning = false;
    audioEngine.stop();

    if (this.onGameEnd && this.beatmap) {
      const replay: Replay = {
        beatmapHash: `${this.beatmap.title}-${this.beatmap.version}`,
        playerName: 'Player',
        mods: Array.from(this.mods),
        score: this.gameState.score,
        maxCombo: this.gameState.maxCombo,
        accuracy: this.gameState.accuracy,
        perfectCount: this.gameState.perfectCount,
        greatCount: this.gameState.greatCount,
        goodCount: this.gameState.goodCount,
        missCount: this.gameState.missCount,
        timestamp: Date.now(),
        frames: this.replayFrames,
      };
      this.onGameEnd(this.gameState, replay);
    }
  }

  // Getters
  getCurrentTime(): number {
    return this.currentTime;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getBeatmap(): Beatmap | null {
    return this.beatmap;
  }

  getCircleRadius(): number {
    return this.circleRadius;
  }

  getApproachTime(): number {
    return this.approachTime;
  }

  getProcessedObjects(): Set<number> {
    return this.processedObjects;
  }

  getActiveSliders(): Map<number, ActiveSlider> {
    return this.activeSliders;
  }

  getActiveSpinners(): Map<number, ActiveSpinner> {
    return this.activeSpinners;
  }

  isGameRunning(): boolean {
    return this.isRunning;
  }

  getBreaks(): { startTime: number; endTime: number }[] {
    return this.beatmap?.breaks || [];
  }
}

export const gameEngine = new GameEngine();
