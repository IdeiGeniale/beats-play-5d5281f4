// Audio Engine for precise music synchronization

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private playbackRate: number = 1;
  private audioFile: File | null = null;

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadAudio(url: string): Promise<AudioBuffer> {
    await this.init();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  async loadAudioFromFile(file: File): Promise<AudioBuffer> {
    await this.init();
    this.audioFile = file;
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  getAudioFile(): File | null {
    return this.audioFile;
  }

  play(startOffset: number = 0): void {
    if (!this.audioContext || !this.audioBuffer || !this.gainNode) return;
    
    this.stop();
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.value = this.playbackRate;
    this.sourceNode.connect(this.gainNode);
    
    const offset = Math.max(0, startOffset / 1000);
    this.startTime = this.audioContext.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;
    
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
      }
    };
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pauseTime = this.getCurrentTime();
    this.stop();
  }

  resume(): void {
    if (this.isPlaying) return;
    this.play(this.pauseTime);
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {
        // Already stopped
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pauseTime;
    return (this.audioContext.currentTime - this.startTime) * 1000 * this.playbackRate;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = rate;
    }
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration * 1000 : 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  seekTo(time: number): void {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseTime = time;
    if (wasPlaying) {
      this.play(time);
    }
  }
}

export const audioEngine = new AudioEngine();
