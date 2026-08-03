/**
 * Movement Manager — Smooth, human-like movement
 * No snapping, no perfect paths, natural wandering
 */

const { goals } = require('mineflayer-pathfinder');

class MovementManager {
  constructor(bot, humanness) {
    this.bot = bot;
    this.h = humanness;
    this.isMoving = false;
    this.wanderInterval = null;
  }

  /**
   * Walk to a position with human-like imperfections
   */
  async walkTo(x, y, z) {
    if (this.isMoving) return;
    this.isMoving = true;

    try {
      // Add sub-optimality — offset target slightly
      const offsetX = this.h.addNoise(0, 0.5);
      const offsetZ = this.h.addNoise(0, 0.5);
      const goal = new goals.GoalBlock(
        Math.floor(x + offsetX),
        Math.floor(y),
        Math.floor(z + offsetZ)
      );

      await this.bot.pathfinder.setGoal(goal, true);
    } catch (err) {
      // Pathfinding can fail — just like a human getting stuck
      console.log(`[Movement] Pathfinding hiccup: ${err.message}`);
      await this.h.delay(1000, 3000);
    }

    this.isMoving = false;
  }

  /**
   * Wander within a radius — natural exploration
   */
  async wander(radius = 32) {
    const pos = this.bot.entity.position;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;

    const tx = Math.floor(pos.x + Math.cos(angle) * dist);
    const tz = Math.floor(pos.z + Math.sin(angle) * dist);

    // Find a valid Y at the target
    const ty = this.bot.world.getHeight(tx, tz) ?? Math.floor(pos.y);

    await this.walkTo(tx, ty, tz);
  }

  /**
   * Start continuous wandering loop
   */
  startWandering(intervalMin = 10000, intervalMax = 30000) {
    const loop = async () => {
      if (!this.bot.entity || this.isMoving) return;

      await this.h.maybeMicroStop();

      const radius = 16 + Math.random() * 48;
      await this.wander(radius);

      // Schedule next wander
      const next = intervalMin + Math.random() * (intervalMax - intervalMin);
      this.wanderInterval = setTimeout(loop, next);
    };

    loop();
  }

  /**
   * Stop wandering
   */
  stopWandering() {
    if (this.wanderInterval) {
      clearTimeout(this.wanderInterval);
      this.wanderInterval = null;
    }
    this.bot.pathfinder.setGoal(null);
    this.isMoving = false;
  }

  /**
   * Move toward an entity (player, mob) naturally
   */
  async approachEntity(entity, preferredDist = 3) {
    if (!entity?.position) return;

    const dist = this.bot.entity.position.distanceTo(entity.position);
    if (dist <= preferredDist + 1) return;

    // Don't go in a straight line — add offset
    const dx = entity.position.x - this.bot.entity.position.x;
    const dz = entity.position.z - this.bot.entity.position.z;
    const angle = Math.atan2(dz, dx) + this.h.addNoise(0, 0.3);

    const targetDist = dist - preferredDist;
    const tx = this.bot.entity.position.x + Math.cos(angle) * targetDist;
    const tz = this.bot.entity.position.z + Math.sin(angle) * targetDist;
    const ty = Math.floor(this.bot.entity.position.y);

    await this.walkTo(Math.floor(tx), ty, Math.floor(tz));
  }

  /**
   * Sprint toggle — humans don't sprint 100% of the time
   */
  async sprintToggled(duration) {
    this.bot.setControlState('sprint', true);
    await this.h.delay(duration * 0.6, duration);
    this.bot.setControlState('sprint', false);
  }

  /**
   * Jump with human timing (not at exact optimal moment)
   */
  async humanJump() {
    await this.h.delay(0, 200); // Slight hesitation
    this.bot.setControlState('jump', true);
    await this.h.delay(300, 600);
    this.bot.setControlState('jump', false);
  }
}

module.exports = MovementManager;
