# 🤖 Mishri — Human-like Minecraft Bot

> A Minecraft bot so human-like, players can't tell the difference.

*"Not a noisy machine. A creature that hesitates, breathes, forgets, gets distracted, and occasionally does things for no reason."*

## Author & License

This repo is a fork of [arpitrajjj/Mishri](https://github.com/arpitrajjj/Mishri) — all credit for
the original design and implementation goes to **arpitrajjj**, who is not affiliated with this
organization. `package.json` declares an ISC license, but no `LICENSE` file is present in this
fork, so the actual terms are ambiguous rather than formally established. **Use at your own
risk.**

## Build

The whole codebase is TypeScript (`src/`, `tests/`), compiled via `tsc` into `dist/`.

```bash
bazel run //:install     # npm ci — installs the real bot's own dependencies
bazel run //:build       # npm run build — compiles src/ + tests/ to dist/ via tsc
bazel test //:test       # real, hermetic unit tests (humanness layer + skin manager)
bazel run //:mishri      # npm start — builds, then runs the real bot
```

Recommended order for a fresh checkout: `install` → `build` → `test`. `bazel test //:test` runs
the already-compiled `dist/tests/humanness.test.js` (Bazel's own sandbox has no network or
`typescript` package to run `tsc` itself, so `dist/` must exist first — a real, honestly-documented
non-hermetic prerequisite for an otherwise hermetic test). `bazel run //:install`/`//:build`/
`//:mishri` are convenience wrappers around the real `npm ci`/`npm run build`/`npm start` workflow
(real network access, real `node_modules`, a real `tsc` compile, a real live server connection),
not hermetic Bazel actions — see `BUILD.bazel`'s own doc comments for why.

## Features

- **🚶 Human-like Movement** — Bezier-curve turning with ease-in-out, micro-stutters, sub-optimal pathing, sprint toggling, variable walk speed
- **💬 Natural Chat** — Delayed responses, adjacent-key typos + corrections, ignores messages, LLM-powered, mood-dependent talkativeness
- **👁️ Perception** — Looks at entities, flinches at damage, double-takes, nervous scanning, idle camera drift, stare at players
- **🧠 Behavior AI** — Utility-scored behavior with randomness + internal mood/energy/boredom system
- **🎯 Imperfect Skills** — Mines wrong blocks, eats at wrong hunger, fumbles inventory, places wrong blocks sometimes
- **🎭 Mood System** — Neutral, curious, tired, bored, social, focused, startled, nervous — affects all behavior
- **⏱️ APM Throttle** — Capped at human action-per-minute rates (default: 80)
- **😴 AFK Simulation** — Randomly goes AFK, has session durations, logs off naturally
- **🎨 Custom Skin** — Inject custom skin URL via login packet properties
- **🤖 LLM Chat** — Optional Ollama/OpenAI integration for dynamic conversation
- **🔄 GitHub Actions** — Auto-test workflow runs the bot for 5-19 minutes on a real server

## Quick Start

```bash
# Clone
git clone https://github.com/arpitrajjj/Mishri.git
cd Mishri

# Install
npm install

# Configure (edit server details + skin)
nano config/default.json

# Run
npm start
```

## Configuration

Edit `config/default.json`:

```json
{
  "server": {
    "host": "your-server.com",
    "port": 25565,
    "version": "1.21.11"
  },
  "bot": {
    "username": "Mishri",
    "auth": "offline"
  },
  "skin": {
    "enabled": true,
    "url": "https://textures.minecraft.net/texture/YOUR_TEXTURE_ID",
    "model": "classic"
  },
  "humanness": {
    "reactionDelayMin": 200,
    "typoChance": 0.15,
    "maxAPM": 80,
    "doubleTakeChance": 0.02,
    "nervousLookAroundChance": 0.03
  }
}
```

### Custom Skin

Get your skin texture URL from [Minecraft Skin Viewer](https://mineskin.org/) or extract it from a premium account. Set `skin.enabled` to `true` and paste the URL.

### LLM Chat (Optional)

```json
{
  "llm": {
    "enabled": true,
    "provider": "ollama",
    "model": "llama3",
    "baseUrl": "http://localhost:11434"
  }
}
```

## GitHub Actions Test Workflow

The bot includes a ready-to-use GitHub Actions workflow that:
1. Spins up a Paper 1.21.11 Minecraft server in Docker
2. Installs Mishri's dependencies
3. Runs humanness tests
4. Connects Mishri to the server for **5-19 minutes**
5. Observes behavior and logs results

### Trigger manually:
```bash
gh workflow run "Mishri Bot Test Run" -f duration=15
```

### Or it runs automatically on push to `main`.

## Architecture

```
┌─────────────────────────────────────────┐
│            MishriBot (Core)              │
│         + SkinManager (🎨)              │
├──────────┬──────────┬───────────────────┤
│ Movement │ Perception│ Social            │
│ Manager  │ Manager  │ Manager           │
├──────────┴──────────┴───────────────────┤
│       Behavior Orchestrator              │
│    (Utility AI + Mood + Energy)          │
├─────────────────────────────────────────┤
│       Skill Manager                      │
│    (Mining · Eating · Building)          │
├─────────────────────────────────────────┤
│       🎭 Humanness Layer                 │
│   (Jitter · Delays · Mood · Typo ·      │
│    Boredom · Fatigue · Fidget ·          │
│    DoubleTake · Nervous · AFK)           │
├─────────────────────────────────────────┤
│       Mineflayer + Plugins               │
└─────────────────────────────────────────┘
```

## Internal State System

Mishri isn't stateless — it has **internal moods and drives** that make behavior feel organic:

| State | Effect |
|-------|--------|
| **Mood** | neutral → curious → tired → bored → social → focused → startled → nervous |
| **Energy** | 0-1, depletes over time, affects speed and willingness to act |
| **Curiosity** | 0-1, drives exploration vs staying put |
| **Social Energy** | Introvert drain — depletes with chat, recovers in solitude |
| **Boredom** | Accumulates when idle, makes bot more likely to wander or fidget |
| **Fatigue** | Gradual slowdown over long sessions (everything gets slower) |

## Anti-Detection Checklist

- [x] No perfect pathing — sub-optimal routes with noise offsets
- [x] No instant responses — 2.5-10s chat delay
- [x] No perfect APM — capped at human range (80 default)
- [x] No 24/7 uptime — AFK + session simulation
- [x] No identical patterns — everything randomized
- [x] No chat patterns — typos, corrections, varied wording, ignore chance
- [x] No perfect aim — gaussian noise + fatigue jitter
- [x] No superhuman awareness — limited FOV + distance
- [x] No instant inventory — delays for item switching
- [x] No robotic turning — Bezier curves with ease-in-out + overshoot
- [x] No constant activity — mood-dependent pacing, boredom, tiredness
- [x] No emotionless behavior — startle, nervous scanning, double-takes

## Project Structure

```
Mishri/
├── .github/workflows/
│   ├── ci.yml                 # Bazel test + construct bundle + auto-release
│   └── test-bot.yml           # GitHub Actions live-server test workflow
├── config/
│   └── default.json           # All configuration
├── src/
│   ├── core/
│   │   ├── MishriBot.ts       # Main bot class
│   │   └── SkinManager.ts     # Custom skin injection
│   ├── movement/
│   │   └── MovementManager.ts
│   ├── perception/
│   │   └── PerceptionManager.ts
│   ├── social/
│   │   └── SocialManager.ts
│   ├── behavior/
│   │   └── BehaviorOrchestrator.ts
│   ├── humanness/
│   │   └── HumannessLayer.ts  # ❤️ The heart of deception
│   ├── skills/
│   │   └── SkillManager.ts
│   ├── types/
│   │   ├── config.ts                     # Shared MishriConfig shape
│   │   └── mineflayer-pathfinder.d.ts    # Ambient shim (no upstream types)
│   └── index.ts
├── tests/
│   └── humanness.test.ts
├── dist/                       # tsc output (gitignored, not committed)
├── tsconfig.json
├── BUILD.bazel / MODULE.bazel
├── package.json
└── README.md
```

## License

ISC
