/**
 * Perception Manager — Awareness of surroundings
 * Looking at things, reacting to events, noticing players
 */

import { Bot } from 'mineflayer';
import { Entity } from 'prismarine-entity';
import { Vec3 } from 'vec3';
import HumannessLayer = require('../humanness/HumannessLayer');

class PerceptionManager {
  bot: Bot;
  h: HumannessLayer;
  lookLoopRunning: boolean;
  lookInterval: ReturnType<typeof setTimeout> | null;
  nearbyPlayers: Map<string, number>;

  constructor(bot: Bot, humanness: HumannessLayer) {
    this.bot = bot;
    this.h = humanness;
    this.lookLoopRunning = false;
    this.lookInterval = null;
    this.nearbyPlayers = new Map();
  }

  /**
   * Start the periodic look-around behavior
   */
  startLookLoop(): void {
    this.lookLoopRunning = true;
    this._lookLoop();
  }

  stop(): void {
    this.lookLoopRunning = false;
    if (this.lookInterval) {
      clearTimeout(this.lookInterval);
      this.lookInterval = null;
    }
  }

  private async _lookLoop(): Promise<void> {
    if (!this.lookLoopRunning) return;

    // Pick something to look at
    const action = Math.random();

    if (action < 0.3) {
      // Look at a nearby entity
      await this.lookAtNearbyEntity();
    } else if (action < 0.5) {
      // Look at the sky (idle daydream)
      await this.lookAtSky();
    } else if (action < 0.7) {
      // Look at nearby block of interest
      await this.lookAtInterestingBlock();
    } else {
      // Slow drift — natural idle camera movement
      await this.idleDrift();
    }

    // Schedule next look with human-variable interval
    const nextDelay =
      this.h.config.lookWanderIntervalMin +
      Math.random() * (this.h.config.lookWanderIntervalMax - this.h.config.lookWanderIntervalMin);
    this.lookInterval = setTimeout(() => this._lookLoop(), nextDelay);
  }

  /**
   * Look at the nearest entity
   */
  async lookAtNearbyEntity(): Promise<void> {
    const entities = Object.values(this.bot.entities)
      .filter((e) => e !== this.bot.entity && e.position)
      .sort(
        (a, b) =>
          this.bot.entity!.position.distanceTo(a.position) - this.bot.entity!.position.distanceTo(b.position)
      );

    if (entities.length === 0) return;

    const target = entities[0];
    await this.h.smoothTurn(this.bot, this.getYawTo(target.position), this.getPitchTo(target.position), this.h.randInt(5, 12));

    // Track nearby players
    if (target.type === 'player' && target.username) {
      this.nearbyPlayers.set(target.username, Date.now());
    }
  }

  /**
   * Look up — idle behavior
   */
  async lookAtSky(): Promise<void> {
    const yaw = this.bot.entity!.yaw + (Math.random() - 0.5) * 0.5;
    const pitch = -Math.PI / 4 + (Math.random() * Math.PI) / 4; // Look up
    await this.h.smoothTurn(this.bot, yaw, pitch, 6);
  }

  /**
   * Look at an interesting block nearby (ores, flowers, etc.)
   */
  async lookAtInterestingBlock(): Promise<void> {
    const pos = this.bot.entity!.position;
    const radius = 8;
    const interestingBlocks = ['diamond_ore', 'iron_ore', 'gold_ore', 'emerald_ore', 'redstone_ore', 'lapis_ore', 'flower', 'rose'];

    for (let dx = -radius; dx <= radius; dx += 2) {
      for (let dy = -3; dy <= 3; dy += 2) {
        for (let dz = -radius; dz <= radius; dz += 2) {
          const block = this.bot.blockAt(pos.offset(dx, dy, dz));
          if (block && interestingBlocks.some((name) => block.name.includes(name))) {
            await this.h.smoothTurn(this.bot, this.getYawTo(block.position), this.getPitchTo(block.position), 8);
            return;
          }
        }
      }
    }
  }

  /**
   * Idle camera drift — like a real player spacing out
   */
  async idleDrift(): Promise<void> {
    const currentYaw = this.bot.entity!.yaw;
    const currentPitch = this.bot.entity!.pitch;
    const driftYaw = currentYaw + (Math.random() - 0.5) * 0.8;
    const driftPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, currentPitch + (Math.random() - 0.5) * 0.4));
    await this.h.smoothTurn(this.bot, driftYaw, driftPitch, 10);
  }

  /**
   * React to damage — flinch!
   */
  async onHealthChange(): Promise<void> {
    // Look around frantically when taking damage
    if (this.bot.health < 20) {
      const panicTurns = this.h.randInt(2, 4);
      for (let i = 0; i < panicTurns; i++) {
        const randomYaw = Math.random() * Math.PI * 2;
        await this.h.smoothTurn(this.bot, randomYaw, 0, 3);
        await this.h.delay(100, 300);
      }
    }
  }

  /**
   * React to an entity getting hurt nearby
   */
  async onEntityHurt(entity: Entity): Promise<void> {
    if (entity === this.bot.entity) return;
    // Briefly look at whoever got hurt
    if (entity.position) {
      await this.h.smoothTurn(this.bot, this.getYawTo(entity.position), this.getPitchTo(entity.position), 5);
    }
  }

  /**
   * Notice when someone swings (attack animation)
   */
  async onEntitySwing(entity: Entity): Promise<void> {
    if (entity === this.bot.entity) return;
    // Brief glance toward the swinger
    if (entity.position && Math.random() < 0.4) {
      await this.h.smoothTurn(this.bot, this.getYawTo(entity.position), this.getPitchTo(entity.position), 4);
    }
  }

  /**
   * Get nearby player count
   */
  getNearbyPlayerCount(radius = 32): number {
    return Object.values(this.bot.entities).filter(
      (e) => e.type === 'player' && e !== this.bot.entity && this.bot.entity!.position.distanceTo(e.position) < radius
    ).length;
  }

  // --- Helpers ---

  getYawTo(pos: Vec3): number {
    const dx = pos.x - this.bot.entity!.position.x;
    const dz = pos.z - this.bot.entity!.position.z;
    return Math.atan2(-dx, dz);
  }

  getPitchTo(pos: Vec3): number {
    const dx = pos.x - this.bot.entity!.position.x;
    const dy = pos.y - this.bot.entity!.position.y;
    const dz = pos.z - this.bot.entity!.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.atan2(-dy, dist);
  }
}

export = PerceptionManager;
