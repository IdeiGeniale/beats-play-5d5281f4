import { Beatmap, HitObject, HitCircle, Slider, Spinner, TimingPoint, SliderPoint } from '@/types/game';

export function parseOsuFile(content: string): Beatmap {
  const lines = content.split('\n').map(line => line.trim());
  
  const beatmap: Beatmap = {
    audioFilename: '',
    audioLeadIn: 0,
    previewTime: -1,
    countdown: 0,
    mode: 0,
    title: 'Unknown',
    artist: 'Unknown',
    creator: 'Unknown',
    version: 'Normal',
    hpDrainRate: 5,
    circleSize: 4,
    overallDifficulty: 5,
    approachRate: 5,
    sliderMultiplier: 1.4,
    sliderTickRate: 1,
    comboColors: ['#ff2d95', '#00f0ff', '#8b5cf6', '#ffd700'],
    timingPoints: [],
    breaks: [],
    hitObjects: [],
  };

  let currentSection = '';
  let comboNumber = 1;
  let currentComboColor = 0;

  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1);
      continue;
    }

    if (!line || line.startsWith('//')) continue;

    switch (currentSection) {
      case 'General':
        parseGeneral(line, beatmap);
        break;
      case 'Metadata':
        parseMetadata(line, beatmap);
        break;
      case 'Difficulty':
        parseDifficulty(line, beatmap);
        break;
      case 'TimingPoints':
        parseTimingPoint(line, beatmap);
        break;
      case 'Events':
        parseEvent(line, beatmap);
        break;
      case 'Colours':
        parseColor(line, beatmap);
        break;
      case 'HitObjects':
        const result = parseHitObject(line, comboNumber, currentComboColor);
        if (result) {
          beatmap.hitObjects.push(result.hitObject);
          comboNumber = result.comboNumber;
          currentComboColor = result.comboColor;
        }
        break;
    }
  }

  // Calculate slider durations based on timing points
  beatmap.hitObjects.forEach(obj => {
    if (obj.type === 'slider') {
      const slider = obj as Slider;
      const timingPoint = getTimingPointAt(beatmap.timingPoints, slider.time);
      if (timingPoint) {
        const beatLength = timingPoint.beatLength > 0 ? timingPoint.beatLength : 500;
        const sliderVelocity = timingPoint.beatLength < 0 ? Math.abs(100 / timingPoint.beatLength) : 1;
        slider.duration = (slider.length / (beatmap.sliderMultiplier * 100 * sliderVelocity)) * beatLength * slider.slides;
        slider.tickCount = Math.max(1, Math.floor(slider.length / (100 * beatmap.sliderMultiplier / beatmap.sliderTickRate)));
      }
    }
  });

  return beatmap;
}

function parseGeneral(line: string, beatmap: Beatmap) {
  const [key, value] = line.split(':').map(s => s.trim());
  switch (key) {
    case 'AudioFilename':
      beatmap.audioFilename = value;
      break;
    case 'AudioLeadIn':
      beatmap.audioLeadIn = parseInt(value) || 0;
      break;
    case 'PreviewTime':
      beatmap.previewTime = parseInt(value) || -1;
      break;
    case 'Countdown':
      beatmap.countdown = parseInt(value) || 0;
      break;
    case 'Mode':
      beatmap.mode = parseInt(value) || 0;
      break;
  }
}

function parseMetadata(line: string, beatmap: Beatmap) {
  const [key, ...rest] = line.split(':');
  const value = rest.join(':').trim();
  switch (key.trim()) {
    case 'Title':
      beatmap.title = value;
      break;
    case 'TitleUnicode':
      beatmap.titleUnicode = value;
      break;
    case 'Artist':
      beatmap.artist = value;
      break;
    case 'ArtistUnicode':
      beatmap.artistUnicode = value;
      break;
    case 'Creator':
      beatmap.creator = value;
      break;
    case 'Version':
      beatmap.version = value;
      break;
    case 'Source':
      beatmap.source = value;
      break;
    case 'Tags':
      beatmap.tags = value.split(' ');
      break;
    case 'BeatmapID':
      beatmap.beatmapId = parseInt(value);
      break;
    case 'BeatmapSetID':
      beatmap.beatmapSetId = parseInt(value);
      break;
  }
}

function parseDifficulty(line: string, beatmap: Beatmap) {
  const [key, value] = line.split(':').map(s => s.trim());
  const numValue = parseFloat(value);
  switch (key) {
    case 'HPDrainRate':
      beatmap.hpDrainRate = numValue;
      break;
    case 'CircleSize':
      beatmap.circleSize = numValue;
      break;
    case 'OverallDifficulty':
      beatmap.overallDifficulty = numValue;
      break;
    case 'ApproachRate':
      beatmap.approachRate = numValue;
      break;
    case 'SliderMultiplier':
      beatmap.sliderMultiplier = numValue;
      break;
    case 'SliderTickRate':
      beatmap.sliderTickRate = numValue;
      break;
  }
}

function parseEvent(line: string, beatmap: Beatmap) {
  const parts = line.split(',');
  // Break period: 2,startTime,endTime
  if (parts[0] === '2' && parts.length >= 3) {
    beatmap.breaks.push({
      startTime: parseInt(parts[1]),
      endTime: parseInt(parts[2]),
    });
  }
}

function parseTimingPoint(line: string, beatmap: Beatmap) {
  const parts = line.split(',');
  if (parts.length < 2) return;

  const timingPoint: TimingPoint = {
    time: parseFloat(parts[0]),
    beatLength: parseFloat(parts[1]),
    meter: parseInt(parts[2]) || 4,
    sampleSet: parseInt(parts[3]) || 0,
    sampleIndex: parseInt(parts[4]) || 0,
    volume: parseInt(parts[5]) || 100,
    uninherited: parts[6] === '1',
    effects: parseInt(parts[7]) || 0,
  };

  beatmap.timingPoints.push(timingPoint);
}

function parseColor(line: string, beatmap: Beatmap) {
  const match = line.match(/Combo(\d+)\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (match) {
    const index = parseInt(match[1]) - 1;
    const r = parseInt(match[2]);
    const g = parseInt(match[3]);
    const b = parseInt(match[4]);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    if (index === 0) {
      beatmap.comboColors = [];
    }
    beatmap.comboColors[index] = hex;
  }
}

function parseHitObject(
  line: string,
  comboNumber: number,
  currentComboColor: number
): { hitObject: HitObject; comboNumber: number; comboColor: number } | null {
  const parts = line.split(',');
  if (parts.length < 4) return null;

  const x = parseInt(parts[0]);
  const y = parseInt(parts[1]);
  const time = parseInt(parts[2]);
  const type = parseInt(parts[3]);

  // Check for new combo
  const isNewCombo = (type & 4) !== 0;
  const comboColorSkip = (type >> 4) & 7;
  
  if (isNewCombo) {
    comboNumber = 1;
    currentComboColor = (currentComboColor + 1 + comboColorSkip) % 4;
  } else {
    comboNumber++;
  }

  // Circle
  if ((type & 1) !== 0) {
    const circle: HitCircle = {
      type: 'circle',
      x,
      y,
      time,
      comboNumber,
      comboColor: currentComboColor,
    };
    return { hitObject: circle, comboNumber, comboColor: currentComboColor };
  }

  // Slider
  if ((type & 2) !== 0) {
    const curveData = parts[5];
    const slides = parseInt(parts[6]) || 1;
    const length = parseFloat(parts[7]) || 100;

    const curveParts = curveData.split('|');
    const curveType = curveParts[0] as 'L' | 'P' | 'B' | 'C';
    const curvePoints: SliderPoint[] = [];

    for (let i = 1; i < curveParts.length; i++) {
      const [px, py] = curveParts[i].split(':').map(Number);
      curvePoints.push({ x: px, y: py });
    }

    const slider: Slider = {
      type: 'slider',
      x,
      y,
      time,
      curveType,
      curvePoints,
      slides,
      length,
      comboNumber,
      comboColor: currentComboColor,
      duration: 0, // Calculated later
      tickCount: 0, // Calculated later
    };
    return { hitObject: slider, comboNumber, comboColor: currentComboColor };
  }

  // Spinner
  if ((type & 8) !== 0) {
    const endTime = parseInt(parts[5]) || time + 1000;
    const spinner: Spinner = {
      type: 'spinner',
      x: 256,
      y: 192,
      time,
      endTime,
      comboNumber: 1,
      comboColor: currentComboColor,
    };
    return { hitObject: spinner, comboNumber: 1, comboColor: currentComboColor };
  }

  return null;
}

function getTimingPointAt(timingPoints: TimingPoint[], time: number): TimingPoint | null {
  let result: TimingPoint | null = null;
  for (const tp of timingPoints) {
    if (tp.time <= time) {
      result = tp;
    } else {
      break;
    }
  }
  return result;
}

export function exportOsuFile(beatmap: Beatmap): string {
  let output = 'osu file format v14\n\n';

  // General section
  output += '[General]\n';
  output += `AudioFilename: ${beatmap.audioFilename}\n`;
  output += `AudioLeadIn: ${beatmap.audioLeadIn}\n`;
  output += `PreviewTime: ${beatmap.previewTime}\n`;
  output += `Countdown: ${beatmap.countdown}\n`;
  output += `Mode: ${beatmap.mode}\n\n`;

  // Metadata section
  output += '[Metadata]\n';
  output += `Title:${beatmap.title}\n`;
  output += `Artist:${beatmap.artist}\n`;
  output += `Creator:${beatmap.creator}\n`;
  output += `Version:${beatmap.version}\n\n`;

  // Difficulty section
  output += '[Difficulty]\n';
  output += `HPDrainRate:${beatmap.hpDrainRate}\n`;
  output += `CircleSize:${beatmap.circleSize}\n`;
  output += `OverallDifficulty:${beatmap.overallDifficulty}\n`;
  output += `ApproachRate:${beatmap.approachRate}\n`;
  output += `SliderMultiplier:${beatmap.sliderMultiplier}\n`;
  output += `SliderTickRate:${beatmap.sliderTickRate}\n\n`;

  // Timing Points
  output += '[TimingPoints]\n';
  for (const tp of beatmap.timingPoints) {
    output += `${tp.time},${tp.beatLength},${tp.meter},${tp.sampleSet},${tp.sampleIndex},${tp.volume},${tp.uninherited ? 1 : 0},${tp.effects}\n`;
  }
  output += '\n';

  // Colors
  output += '[Colours]\n';
  beatmap.comboColors.forEach((color, i) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    output += `Combo${i + 1} : ${r},${g},${b}\n`;
  });
  output += '\n';

  // Hit Objects
  output += '[HitObjects]\n';
  for (const obj of beatmap.hitObjects) {
    if (obj.type === 'circle') {
      const typeFlag = 1 | (obj.comboNumber === 1 ? 4 : 0);
      output += `${obj.x},${obj.y},${obj.time},${typeFlag},0,0:0:0:0:\n`;
    } else if (obj.type === 'slider') {
      const typeFlag = 2 | (obj.comboNumber === 1 ? 4 : 0);
      const curveStr = `${obj.curveType}|${obj.curvePoints.map(p => `${p.x}:${p.y}`).join('|')}`;
      output += `${obj.x},${obj.y},${obj.time},${typeFlag},0,${curveStr},${obj.slides},${obj.length}\n`;
    } else if (obj.type === 'spinner') {
      const typeFlag = 8 | 4;
      output += `${obj.x},${obj.y},${obj.time},${typeFlag},0,${obj.endTime}\n`;
    }
  }

  return output;
}
