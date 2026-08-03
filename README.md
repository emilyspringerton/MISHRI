# 🤖 Mishri — Human-like Minecraft Bot

> A Minecraft bot so human-like, players can't tell the difference.

## What is Mishri?

Mishri is a Minecraft bot built on [mineflayer](https://github.com/PrismarineJS/mineflayer) that simulates human behavior at every level — movement, chat, decision-making, and even mistakes. The goal: **blend in so well that nobody knows it's a bot.**

## Features

- **🚶 Human-like Movement** — Bezier-curve turning, micro-stutters, sub-optimal pathing, sprint toggling
- **💬 Natural Chat** — Delayed responses, typos + corrections, ignores messages sometimes, LLM-powered responses
- **👁️ Perception** — Looks at entities, flinches at damage, notices interesting blocks, idle camera drift
- **🧠 Behavior AI** — Utility-scored behavior selection with randomness (wander, mine, socialize, idle, fidget)
- **🎯 Imperfect Skills** — Mines wrong blocks sometimes, eats at wrong hunger, fumbles inventory
- **⏱️ APM Throttle** — Capped at human action-per-minute rates
- **😴 AFK Simulation** — Randomly goes AFK, has session durations, logs off naturally
- **🤖 LLM Chat** — Optional integration with Ollama/OpenAI for dynamic conversation

## Quick Start

```bash
# Clone
git clone https://github.com/arpitrajjj/Mishri.git
cd Mishri

# Install
npm install

# Configure (edit server details)
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
    "version": "1.20.4"
  },
  "bot": {
    "username": "Mishri",
    "auth": "offline"
  },
  "humanness": {
    "reactionDelayMin": 150,
    "typoChance": 0.12,
    "maxAPM": 90
  }
}
```

### LLM Chat (Optional)

Set `llm.enabled` to `true` and configure your provider:

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

## Architecture

```
┌─────────────────────────────────────────┐
│            MishriBot (Core)              │
├──────────┬──────────┬───────────────────┤
│ Movement │ Perception│ Social            │
│ Manager  │ Manager  │ Manager           │
├──────────┴──────────┴───────────────────┤
│       Behavior Orchestrator              │
├─────────────────────────────────────────┤
│       Skill Manager                      │
├─────────────────────────────────────────┤
│       🎭 Humanness Layer                 │
│   (Jitter · Delays · Imperfection)       │
├─────────────────────────────────────────┤
│       Mineflayer + Plugins               │
└─────────────────────────────────────────┘
```

## Anti-Detection Checklist

- [x] No perfect pathing — sub-optimal routes
- [x] No instant responses — 2-8s chat delay
- [x] No perfect APM — capped at human range
- [x] No 24/7 uptime — AFK + session simulation
- [x] No identical patterns — everything randomized
- [x] No chat patterns — typos, varied wording, ignore chance
- [x] No perfect aim — gaussian noise on targeting
- [x] No superhuman awareness — limited FOV + distance
- [x] No instant inventory — delays for item switching

## Project Structure

```
Mishri/
├── config/
│   └── default.json          # All configuration
├── src/
│   ├── core/
│   │   └── MishriBot.js      # Main bot class
│   ├── movement/
│   │   └── MovementManager.js
│   ├── perception/
│   │   └── PerceptionManager.js
│   ├── social/
│   │   └── SocialManager.js
│   ├── behavior/
│   │   └── BehaviorOrchestrator.js
│   ├── humanness/
│   │   └── HumannessLayer.js  # ❤️ The heart of deception
│   ├── skills/
│   │   └── SkillManager.js
│   └── index.js
├── tests/
│   └── humanness.test.js
├── package.json
└── README.md
```

## License

ISC
