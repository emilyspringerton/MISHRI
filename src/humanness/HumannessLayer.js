/**
 * Humanness Layer — The heart of Mishri's deception
 * Adds jitter, delays, imperfection, and randomness to every action
 */

class HumannessLayer {
  constructor(config = {}) {
    this.config = config;
    this.actionCount = 0;
    this.actionWindowStart = Date.now();
    this.maxAPM = config.maxAPM || 90;
  }

  /**
   * Random delay within range — THE core primitive
   * Every action must pass through this
   */
  async delay(min = 150, max = 800) {
    const ms = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reaction delay — simulates human response time
   */
  async reactionDelay() {
    return this.delay(this.config.reactionDelayMin || 150, this.config.reactionDelayMax || 800);
  }

  /**
   * Chat delay — humans don't reply instantly
   */
  async chatDelay() {
    return this.delay(this.config.chatDelayMin || 2000, this.config.chatDelayMax || 8000);
  }

  /**
   * APM throttle — cap actions per minute to human range
   */
  async throttleAPM() {
    const now = Date.now();
    const elapsed = now - this.actionWindowStart;

    if (elapsed > 60000) {
      this.actionCount = 0;
      this.actionWindowStart = now;
    }

    this.actionCount++;
    if (this.actionCount > this.maxAPM) {
      const waitTime = 60000 - elapsed + Math.random() * 5000;
      console.log(`[Humanness] APM throttle — waiting ${Math.round(waitTime / 1000)}s`);
      await new Promise((r) => setTimeout(r, waitTime));
      this.actionCount = 0;
      this.actionWindowStart = Date.now();
    }
  }

  /**
   * Add gaussian noise to a value (for aim, movement, etc.)
   */
  addNoise(value, sigma = 0.05) {
    // Box-Muller transform for gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return value + z * sigma;
  }

  /**
   * Add noise to yaw/pitch for imperfect aim
   */
  imperfectAim(yaw, pitch) {
    const factor = 1 - (this.config.imperfectAim || 0.85);
    const noiseYaw = this.addNoise(yaw, factor * Math.PI);
    const noisePitch = this.addNoise(pitch, factor * Math.PI / 4);
    return { yaw: noiseYaw, pitch: noisePitch };
  }

  /**
   * Micro-stop — occasionally pause briefly while moving
   */
  async maybeMicroStop() {
    if (Math.random() < (this.config.microStopChance || 0.03)) {
      await this.delay(200, 1500);
    }
  }

  /**
   * Should we go AFK?
   */
  shouldAFK() {
    return Math.random() < (this.config.afkChance || 0.05);
  }

  /**
   * Random AFK duration
   */
  randomAFKDuration() {
    return this.delay(
      this.config.afkDurationMin || 10000,
      this.config.afkDurationMax || 120000
    );
  }

  /**
   * Introduce a typo into text
   */
  maybeTypo(text) {
    if (Math.random() > (this.config.typoChance || 0.12) || text.length < 3) {
      return text;
    }

    const ops = ['swap', 'delete', 'duplicate'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const pos = 1 + Math.floor(Math.random() * (text.length - 2));

    switch (op) {
      case 'swap':
        if (pos < text.length - 1) {
          return text.slice(0, pos) + text[pos + 1] + text[pos] + text.slice(pos + 2);
        }
        break;
      case 'delete':
        return text.slice(0, pos) + text.slice(pos + 1);
      case 'duplicate':
        return text.slice(0, pos) + text[pos] + text[pos] + text.slice(pos + 1);
    }
    return text;
  }

  /**
   * Smooth Bezier interpolation for turning
   */
  bezierInterp(start, end, t) {
    // Quadratic bezier with a random control point offset
    const offset = (Math.random() - 0.5) * 0.5;
    const mid = (start + end) / 2 + offset;
    const u = 1 - t;
    return u * u * start + 2 * u * t * mid + t * t * end;
  }

  /**
   * Smooth turning from current yaw to target yaw
   */
  async smoothTurn(bot, targetYaw, targetPitch, steps = 8) {
    const startYaw = bot.entity.yaw;
    const startPitch = bot.entity.pitch;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const yaw = this.bezierInterp(startYaw, targetYaw, t);
      const pitch = this.bezierInterp(startPitch, targetPitch, t);
      bot.look(yaw, pitch, false);
      await this.delay(30, 80);
    }
  }

  /**
   * Random boolean with given probability
   */
  chance(probability = 0.5) {
    return Math.random() < probability;
  }

  /**
   * Pick random item from array
   */
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Random integer in range
   */
  randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }
}

module.exports = HumannessLayer;
