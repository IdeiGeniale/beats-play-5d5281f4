# 🎵 Beats66

A browser-based rhythm game inspired by osu!, built entirely with web technologies. Click circles, follow sliders, and spin spinners to the beat.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## ✨ Features

### Gameplay
- **Full osu!standard gameplay** — hit circles, sliders (with reverse arrows), and spinners
- **Accurate hit detection** with Perfect/Great/Good/Miss judgements and hit windows
- **Combo & scoring system** — score-based grade calculation (SS, S, A, B, C, D)
- **HP drain** — health bar that drains on misses and recovers on hits
- **Replay system** — record and watch replays of your plays

### Mods
- 🤖 **Auto** — watch the game play itself
- 🟢 **Easy** — larger circles, forgiving HP
- 🔴 **Hard Rock** — smaller circles, stricter timing
- ⏩ **Double Time** — 1.5× speed
- ⏪ **Half Time** — 0.75× speed
- 👁️ **Hidden** — circles fade out before you hit them
- 🔦 **Flashlight** — limited field of view

### Editor
- **Built-in beatmap editor** with a draggable timeline
- Place hit circles, sliders, and spinners visually on a canvas
- **`.osz` export** — package your beatmap as a standard `.osz` archive
- `.osu` file import/export with full format v14 support

### Audio
- Custom **Web Audio API** engine with precise timing
- Adjustable music & effect volumes
- Background dim settings

### Other
- 🎨 Cyberpunk/synthwave dark UI with neon accents
- Particle background animations
- Local score storage with per-beatmap leaderboards
- Responsive settings panel (volume, background dim, cursor size, FPS counter)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/beats66.git
cd beats66

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The game will be available at `http://localhost:5173`.

## 🎮 How to Play

1. **Launch the game** and click **Play** from the main menu
2. **Select a song** — import a `.osu` or `.osz` file, or use a built-in demo beatmap
3. **Click circles** when the approach circle shrinks to meet the hit circle
4. **Follow sliders** — click and hold, following the slider ball along the path
5. **Spin spinners** — move your cursor in circles as fast as you can
6. Try to maintain your **combo** and hit every note for the best score!

### Controls

| Action | Input |
|--------|-------|
| Hit / Click | Left mouse button / Touch |
| Pause | `Escape` |

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Rendering:** HTML5 Canvas (2D)
- **Audio:** Web Audio API
- **Animations:** Framer Motion
- **Packaging:** JSZip (for `.osz` export)

## 📁 Project Structure

```
src/
├── components/
│   └── game/
│       ├── GameCanvas.tsx      # Core gameplay renderer
│       ├── MainMenu.tsx        # Main menu screen
│       ├── SongSelect.tsx      # Song selection screen
│       ├── BeatmapEditor.tsx   # Beatmap editor
│       ├── EditorTimeline.tsx  # Editor timeline scrubber
│       ├── ResultsScreen.tsx   # Post-play results
│       ├── ScoresScreen.tsx    # Score leaderboards
│       ├── ReplayPlayer.tsx    # Replay viewer
│       ├── SettingsPanel.tsx   # Game settings
│       └── ...
├── lib/
│   ├── gameEngine.ts           # Game loop & hit detection
│   ├── audioEngine.ts          # Web Audio API wrapper
│   ├── osuParser.ts            # .osu file parser & exporter
│   └── scoreStorage.ts         # Local score persistence
├── types/
│   ├── game.ts                 # Core game type definitions
│   └── score.ts                # Score & grade types
└── pages/
    └── Index.tsx               # Main app entry with screen routing
```

## 📄 License

This project is open source. See [LICENSE](LICENSE) for details.

---

Made with love by IdeiGenialeGMD
