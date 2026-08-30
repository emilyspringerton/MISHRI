/**
 * Behavior Orchestrator — What should Mishri do right now?
 * Utility-based scoring with randomness + actual functional behaviors
 */

import { Bot } from 'mineflayer';
import HumannessLayer = require('../humanness/HumannessLayer');
import type MishriBot = require('../core/MishriBot');

interface BehaviorHistoryEntry {
  name: string;
  time: number;
}

interface ScoredBehavior {
  name: string;
  score: number;
  execute: () => Promise<void>;
}

class BehaviorOrchestrator {
  bot: Bot;
  h: HumannessLayer;
  mishri: MishriBot;
  running: boolean;
  currentBehavior: string | null;
  behaviorInterval: ReturnType<typeof setTimeout> | null;
  afkInterval: ReturnType<typeof setTimeout> | null;
  lastBehaviorTime: number;
  behaviorHistory: BehaviorHistoryEntry[]; // Track what we've been doing

  constructor(bot: Bot, humanness: HumannessLayer, mishri: MishriBot) {
    this.bot = bot;
    this.h = humanness;
    this.mishri = mishri;
    this.running = false;
    this.currentBehavior = null;
    this.behaviorInterval = null;
    this.afkInterval = null;
    this.lastBehaviorTime = 0;
    this.behaviorHistory = [];
  }

  start(): void {
    this.running = true;
    this._behaviorLoop();
  }

  stop(): void {
    this.running = false;
    if (this.behaviorInterval) clearTimeout(this.behaviorInterval);
    if (this.afkInterval) clearTimeout(this.afkInterval);
  }

  /**
   * Main behavior decision loop
   */
  private async _behaviorLoop(): Promise<void> {
    if (!this.running) return;

    try {
      const behavior = this._decideBehavior();
      console.log(`[Behavior] Decided: ${behavior.name} (score: ${behavior.score.toFixed(2)})`);

      this.currentBehavior = behavior.name;
      this.behaviorHistory.push({ name: behavior.name, time: Date.now() });
      if (this.behaviorHistory.length > 50) this.behaviorHistory.shift();

      await behavior.execute();
      this.currentBehavior = null;
    } catch (err) {
      console.log(`[Behavior] Error: ${(err as Error).message}`);
      await this.h.delay(2000, 5000);
    }

    // Variable interval between decisions (human-like pacing)
    const nextDelay = 3000 + Math.random() * 15000;
    this.behaviorInterval = setTimeout(() => this._behaviorLoop(), nextDelay);
  }

  /**
   * Utility AI — score behaviors and pick the best
   */
  private _decideBehavior(): ScoredBehavior {
    const behaviors: ScoredBehavior[] = [
      { name: 'wander', score: this._scoreWander(), execute: () => this._doWander() },
      { name: 'mine', score: this._scoreMine(), execute: () => this._doMine() },
      { name: 'chopTree', score: this._scoreChopTree(), execute: () => this._doChopTree() },
      { name: 'eat', score: this._scoreEat(), execute: () => this._doEat() },
      { name: 'socialize', score: this._scoreSocialize(), execute: () => this._doSocialize() },
      { name: 'craft', score: this._scoreCraft(), execute: () => this._doCraft() },
      { name: 'explore', score: this._scoreExplore(), execute: () => this._doExplore() },
      { name: 'idle', score: this._scoreIdle(), execute: () => this._doIdle() },
      { name: 'fidget', score: this._scoreFidget(), execute: () => this._doFidget() },
    ];

    // Add random noise (prevents predictability)
    behaviors.forEach((b) => {
      b.score += (Math.random() - 0.5) * 0.3;
      b.score = Math.max(0, b.score);
    });

    // Penalize doing the same thing repeatedly
    const recentNames = this.behaviorHistory.slice(-3).map((b) => b.name);
    behaviors.forEach((b) => {
      const repeats = recentNames.filter((n) => n === b.name).length;
      b.score -= repeats * 0.15; // Less likely to repeat
    });

    behaviors.sort((a, b) => b.score - a.score);
    return behaviors[0];
  }

  // --- Scoring ---

  private _scoreWander(): number {
    return 0.4 + this.h.curiosity * 0.2;
  }

  private _scoreMine(): number {
    const hasTool = this.bot.inventory.items().some((i) => i.name.includes('pickaxe') || i.name.includes('_pickaxe'));
    return hasTool ? 0.5 + Math.random() * 0.3 : 0.15;
  }

  private _scoreChopTree(): number {
    const hasAxe = this.bot.inventory.items().some((i) => i.name.includes('axe') || i.name.includes('_axe'));
    return hasAxe ? 0.4 + Math.random() * 0.2 : 0.2;
  }

  private _scoreEat(): number {
    // Urgent if hungry
    if (this.bot.food < 10) return 0.9;
    if (this.bot.food < 16) return 0.3;
    return 0.05;
  }

  private _scoreSocialize(): number {
    const nearby = this.mishri.perception?.getNearbyPlayerCount?.() || 0;
    const socialMult = this.h.socialEnergy;
    return nearby > 0 ? (0.5 + nearby * 0.1) * socialMult : 0.05;
  }

  private _scoreCraft(): number {
    // After mining, often want to craft
    const recentMine = this.behaviorHistory.slice(-5).some((b) => b.name === 'mine' || b.name === 'chopTree');
    return recentMine ? 0.4 : 0.15;
  }

  private _scoreExplore(): number {
    return 0.3 + this.h.curiosity * 0.3;
  }

  private _scoreIdle(): number {
    return this.h.boredom * 0.3 + 0.15;
  }

  private _scoreFidget(): number {
    return 0.15 + Math.random() * 0.1;
  }

  // --- Executors ---

  private async _doWander(): Promise<void> {
    if (!this.mishri.movement) return;
    await this.h.reactionDelay();
    await this.mishri.movement.wander(16 + Math.random() * 32);
  }

  private async _doMine(): Promise<void> {
    if (!this.mishri.skills) return;
    await this.h.reactionDelay();
    await this.mishri.skills.mineRandom();
  }

  private async _doChopTree(): Promise<void> {
    if (!this.mishri.skills) return;
    await this.h.reactionDelay();
    await this.mishri.skills.chopTree();
  }

  private async _doEat(): Promise<void> {
    if (!this.mishri.skills) return;
    await this.mishri.skills.eatFood();
  }

  private async _doSocialize(): Promise<void> {
    const players = Object.values(this.bot.entities)
      .filter((e) => e.type === 'player' && e !== this.bot.entity)
      .sort((a, b) => this.bot.entity!.position.distanceTo(a.position) - this.bot.entity!.position.distanceTo(b.position));

    if (players.length > 0) {
      // Approach the nearest player
      await this.mishri.movement!.approachEntity(players[0], 4);

      // Maybe say something
      if (Math.random() < 0.4) {
        const remarks = ['whats up', 'need anything?', 'nice base', 'howdy', 'hey', 'cool stuff'];
        this.bot.chat(this.h.pick(remarks));
      }
      this.h.onSocialInteraction();
    } else {
      // No one nearby, just wander toward spawn/players
      await this.mishri.movement!.wander(32);
    }
  }

  private async _doCraft(): Promise<void> {
    if (!this.mishri.skills) return;
    await this.mishri.skills.craftBasic();
  }

  private async _doExplore(): Promise<void> {
    if (!this.mishri.movement) return;
    await this.mishri.movement.wander(48 + Math.random() * 64);
  }

  private async _doIdle(): Promise<void> {
    const duration = 3000 + Math.random() * 8000;
    await this.h.delay(duration);

    // Fidget while idle
    if (Math.random() < 0.5) {
      await this.h.maybeScrollHotbar(this.bot);
    }
    if (Math.random() < 0.3) {
      await this.h.maybeSneakPeek(this.bot);
    }
  }

  private async _doFidget(): Promise<void> {
    const fidgets = [
      () => this.bot.setQuickBarSlot(this.h.randInt(0, 8)),
      () => this.bot.activateItem(),
      () => this.bot.deactivateItem(),
    ];
    const fidget = this.h.pick(fidgets);
    try {
      fidget();
    } catch (e) {
      /* fidget failures are cosmetic, ignore */
    }
    await this.h.delay(200, 800);
  }

  // --- AFK ---

  startAFKSimulator(): void {
    const checkAFK = async () => {
      if (this.h.shouldAFK() && !this.currentBehavior) {
        console.log('[Behavior] Going AFK...');
        this.currentBehavior = 'afk';
        await this.h.randomAFKDuration();
        this.currentBehavior = null;
        console.log('[Behavior] Back from AFK');
      }
      const next = 60000 + Math.random() * 240000;
      this.afkInterval = setTimeout(checkAFK, next);
    };
    this.afkInterval = setTimeout(checkAFK, 300000 + Math.random() * 600000);
  }
}

export = BehaviorOrchestrator;
