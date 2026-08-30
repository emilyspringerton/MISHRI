/**
 * Mishri — Human-like Minecraft Bot
 * "Not a noisy machine. A creature that hesitates, breathes, and forgets."
 */

import path from 'path';
import mineflayer, { Bot } from 'mineflayer';
import { pathfinder } from 'mineflayer-pathfinder';
import * as collectBlock from 'mineflayer-collectblock';
import * as pvp from 'mineflayer-pvp';
import * as toolPlugin from 'mineflayer-tool';
import { Entity } from 'prismarine-entity';

// mineflayer-auto-eat is a real, pure-ESM-only package ("type": "module", no CJS build) --
// unlike the other four plugins above, a real `import` statement against it fails TS's own
// static node16 ESM/CJS interop check even though a plain `require()` call actually works fine
// at runtime on this project's own real Node 20 (confirmed live: Node's own require-of-ESM
// interop already handles this specific package's own real shape). Real, minimal, honest
// workaround: keep this one as a plain, untyped `require()` -- not an `import` -- since TS only
// statically checks `import` statements against a module's own declared type, not raw
// `require()` calls.
const autoEat = require('mineflayer-auto-eat');

import SkinManager = require('./SkinManager');
import HumannessLayer = require('../humanness/HumannessLayer');
import MovementManager = require('../movement/MovementManager');
import PerceptionManager = require('../perception/PerceptionManager');
import SocialManager = require('../social/SocialManager');
import BehaviorOrchestrator = require('../behavior/BehaviorOrchestrator');
import SkillManager = require('../skills/SkillManager');
import { MishriConfig } from '../types/config';

// Resolve paths relative to this file's directory
// This file is at src/core/MishriBot.ts, project root is 2 levels up
const _thisDir = __dirname;
const config: MishriConfig = require(path.resolve(_thisDir, '..', '..', 'config', 'default.json'));

class MishriBot {
  config: MishriConfig;
  bot: Bot | null;
  running: boolean;
  startTime: number | null;

  skin: SkinManager;
  humanness: HumannessLayer;
  movement: MovementManager | null;
  perception: PerceptionManager | null;
  social: SocialManager | null;
  behavior: BehaviorOrchestrator | null;
  skills: SkillManager | null;

  constructor(overrides: Partial<MishriConfig> = {}) {
    this.config = { ...config, ...overrides };
    this.bot = null;
    this.running = false;
    this.startTime = null;

    // Sub-systems
    this.skin = new SkinManager(this.config.skin);
    this.humanness = new HumannessLayer(this.config.humanness);
    this.movement = null;
    this.perception = null;
    this.social = null;
    this.behavior = null;
    this.skills = null;
  }

  /**
   * Connect to the Minecraft server
   */
  connect(): this {
    const isMicrosoft =
      this.config.bot.auth === 'microsoft' || SkinManager.isMicrosoftAuth(this.config.bot.email, this.config.bot.password);

    const authType = isMicrosoft ? 'microsoft' : this.config.bot.auth || 'offline';
    const username = isMicrosoft ? this.config.bot.email || this.config.bot.username : this.config.bot.username;
    const password = isMicrosoft ? this.config.bot.password : this.config.bot.password || '';

    console.log(
      `[Mishri] Connecting as ${isMicrosoft ? this.config.bot.username + ' (Microsoft)' : this.config.bot.username} to ${this.config.server.host}:${this.config.server.port} (v${this.config.server.version})`
    );

    const botOptions: mineflayer.BotOptions = {
      host: this.config.server.host,
      port: this.config.server.port,
      username: username!,
      password: password,
      auth: authType as 'offline' | 'microsoft',
      version: this.config.server.version,
      hideErrors: false,
    };

    // Only inject skin for offline auth (Microsoft auth uses the premium skin)
    if (!isMicrosoft) {
      const skinProps = this.skin.getProfileProperties();
      if (skinProps) {
        (botOptions as any).profileProperties = skinProps;
        console.log('[Mishri] Custom skin will be applied (offline auth)');
      }
    } else {
      console.log('[Mishri] Using Microsoft auth — premium skin will be used automatically');
    }

    this.bot = mineflayer.createBot(botOptions);

    // Also inject skin via packet hook (offline only)
    if (!isMicrosoft) {
      this.skin.injectSkin(this.bot);
    }

    // Load plugins
    this.bot.loadPlugin(pathfinder);
    this.bot.loadPlugin((autoEat as any).loader);
    this.bot.loadPlugin((collectBlock as any).plugin);
    this.bot.loadPlugin((pvp as any).plugin);
    this.bot.loadPlugin((toolPlugin as any).plugin);

    // Initialize sub-systems
    this.movement = new MovementManager(this.bot, this.humanness);
    this.perception = new PerceptionManager(this.bot, this.humanness);
    this.social = new SocialManager(this.bot, this.humanness, this.config);
    this.behavior = new BehaviorOrchestrator(this.bot, this.humanness, this);
    this.skills = new SkillManager(this.bot, this.humanness);

    // Wire up events
    this._registerEvents();

    return this;
  }

  /**
   * Register all event handlers
   */
  private _registerEvents(): void {
    const bot = this.bot!;

    bot.once('spawn', () => {
      console.log('[Mishri] Spawned in world!');
      this.running = true;
      this.startTime = Date.now();
      this._onSpawn();
    });

    bot.on('chat', (username: string, message: string) => {
      if (username === bot.username) return;
      this.humanness.onInterestingEvent();
      this.social!.onChat(username, message);
    });

    bot.on('health', () => {
      this.perception!.onHealthChange();
    });

    bot.on('entityHurt', (entity: Entity) => {
      this.perception!.onEntityHurt(entity);
      // If WE got hurt, get startled
      if (entity === bot.entity) {
        this.humanness.getStartled();
      }
    });

    // Real, live bug found and fixed by this TS conversion's own type checking: the original JS
    // registered this handler for 'entitySwing', which mineflayer's real BotEvents type has
    // never had (the real event name is 'entitySwingArm') -- meaning this handler was silent,
    // permanently-dead code that never actually fired, since JS doesn't type-check event names
    // at all. Fixed to the real event name here.
    bot.on('entitySwingArm', (entity: Entity) => {
      this.perception!.onEntitySwing(entity);
    });

    bot.on('playerJoined', (player) => {
      console.log(`[Mishri] ${player.username} joined`);
      this.humanness.onInterestingEvent();
      // Maybe greet them after a delay
      if (Math.random() < 0.4) {
        this.humanness.delay(3000, 8000).then(() => {
          this.social!.onChat(player.username, 'just joined');
        });
      }
    });

    bot.on('playerLeft', (player) => {
      console.log(`[Mishri] ${player.username} left`);
    });

    bot.on('kicked', (reason) => {
      console.log(`[Mishri] Kicked: ${reason}`);
      this.running = false;
    });

    bot.on('error', (err: Error) => {
      console.log(`[Mishri] Error: ${err.message}`);
    });

    bot.on('end', () => {
      console.log('[Mishri] Disconnected.');
      this.running = false;
    });

    bot.on('death', () => {
      this._onDeath();
    });

    // Periodic humanness behaviors
    bot.on('physicsTick', () => {
      if (Math.random() < 0.002) {
        // ~every 50 seconds
        this._periodicHumanness();
      }
    });
  }

  /**
   * Called when the bot spawns
   */
  private async _onSpawn(): Promise<void> {
    await this.humanness.delay(2000, 5000);
    this.social!.maybeGreet();

    this.behavior!.start();
    this.perception!.startLookLoop();
    this.behavior!.startAFKSimulator();

    // Start the periodic state logger
    this._startStateLogger();

    console.log('[Mishri] All systems online. Blending in...');
  }

  /**
   * Periodic humanness behaviors — little things that make us look alive
   */
  private async _periodicHumanness(): Promise<void> {
    if (!this.running || !this.bot?.entity) return;

    // Scroll hotbar aimlessly
    await this.humanness.maybeScrollHotbar(this.bot);

    // Sneak peek
    await this.humanness.maybeSneakPeek(this.bot);

    // Fidget with held item
    await this.humanness.maybeFidgetItem(this.bot);

    // Check inventory briefly
    await this.humanness.maybeCheckInventory(this.bot);

    // Nervous look around (in dark, after damage)
    await this.humanness.nervousLookAround(this.bot);
  }

  /**
   * Handle death like a human
   */
  private async _onDeath(): Promise<void> {
    console.log('[Mishri] Died! Respawning...');
    this.humanness.getStartled();
    await this.humanness.delay(1500, 5000);

    const deathMessages = ['rip', 'oof', 'bruh', 'that was dumb', 'lag', 'ouch'];
    this.bot!.chat(this.humanness.pick(deathMessages));
    await this.humanness.delay(500, 2000);
    this.bot!.respawn();
  }

  /**
   * Log internal state periodically
   */
  private _startStateLogger(): void {
    setInterval(() => {
      if (!this.running) return;
      const state = this.humanness.getState();
      const uptime = Math.round((Date.now() - this.startTime!) / 60000);
      console.log(`[Mishri] State: ${JSON.stringify(state)} | Uptime: ${uptime}m | Behavior: ${this.behavior?.currentBehavior || 'none'}`);
    }, 300000); // Every 5 minutes
  }

  /**
   * Disconnect gracefully
   */
  async disconnect(): Promise<void> {
    this.running = false;

    // Say goodbye like a human
    if (this.bot?.entity) {
      const farewells = ['cya', 'gotta go', 'later', 'im out', 'bye'];
      this.bot.chat(this.humanness.pick(farewells));
      await this.humanness.delay(1000, 3000);
    }

    this.behavior?.stop();
    this.perception?.stop();
    this.bot?.quit();
    console.log('[Mishri] Disconnected.');
  }
}

// --- CLI ---
if (require.main === module) {
  const bot = new MishriBot();
  bot.connect();

  process.on('SIGINT', async () => {
    await bot.disconnect();
    process.exit(0);
  });
}

export = MishriBot;
