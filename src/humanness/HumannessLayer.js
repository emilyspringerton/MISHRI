/**
 * Humanness Layer — The heart of Mishri's deception
 * Every action passes through this to add human imperfection
 * 
 * Philosophy: "A human is not a noisy machine.
 *              A human is a creature that hesitates, breathes, forgets,
 *              gets distracted, and occasionally does things for no reason."
 */

class HumannessLayer {
  constructor(config = {}) {
    this.config = config;
    this.actionCount = 0;
    this.actionWindowStart = Date.now();
    this.maxAPM = config.maxAPM || 80;

    // Internal state that makes behavior feel organic
    this.mood = 'neutral';       // affects response patterns
    this.energy = 1.0;           // 0-1, depletes over time, recovers with rest
    this.curiosity = 0.5;        // drives exploration vs staying put
    this.socialEnergy = 0.7;     // introvert drain from socializing
    this.lastActionTime = 0;
    this.boredom = 0;            // accumulates when idle, resets on interesting event
    this.fatigueAccum = 0;       // gradual slowing over long sessions

    // Start the subtle internal state shifts
    this._startMoodCycles();
  }

  // ═══════════════════════════════════════════
  //  CORE PRIMITIVES — Every action uses these
  // ═══════════════════════════════════════════

  /**
   * Random delay within range — THE core primitive
   * Affected by fatigue, mood, and energy level
   */
  async delay(min = 200, max = 1200) {
    // Fatigue makes everything slower
    const fatigueMult = 1 + this.fatigueAccum * 0.5;
    // Low energy = slower
    const energyMult = 1 + (1 - this.energy) * 0.3;

    const adjMin = min * fatigueMult * energyMult;
    const adjMax = max * fatigueMult * energyMult;
    const ms = adjMin + Math.random() * (adjMax - adjMin);

    // Accumulate fatigue over time
    this.fatigueAccum = Math.min(1, this.fatigueAccum + ms / 3600000); // 1hr = 1 fatigue

    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reaction delay — simulates human response time
   * Faster when alert, slower when tired or distracted
   */
  async reactionDelay() {
    const baseMin = this.config.reactionDelayMin || 200;
    const baseMax = this.config.reactionDelayMax || 1200;

    // Startled = faster reactions (just took damage, etc.)
    if (this.mood === 'startled') {
      return this.delay(baseMin * 0.5, baseMax * 0.5);
    }
    // Tired = slower
    if (this.mood === 'tired' || this.energy < 0.3) {
      return this.delay(baseMin * 1.5, baseMax * 2);
    }
    return this.delay(baseMin, baseMax);
  }

  /**
   * Chat delay — humans think, then type, then send
   */
  async chatDelay() {
    const baseMin = this.config.chatDelayMin || 2500;
    const baseMax = this.config.chatDelayMax || 10000;

    // Low social energy = less likely to respond quickly
    const socialMult = 1 + (1 - this.socialEnergy) * 0.8;
    return this.delay(baseMin * socialMult, baseMax * socialMult);
  }

  // ═══════════════════════════════════════════
  //  APM THROTTLE — Cap to human action rates
  // ═══════════════════════════════════════════

  async throttleAPM() {
    const now = Date.now();
    const elapsed = now - this.actionWindowStart;

    if (elapsed > 60000) {
      this.actionCount = 0;
      this.actionWindowStart = now;
    }

    this.actionCount++;
    if (this.actionCount > this.maxAPM) {
      const waitTime = 60000 - elapsed + Math.random() * 8000;
      console.log(`[Human] APM throttle — waiting ${Math.round(waitTime / 1000)}s`);
      await new Promise((r) => setTimeout(r, waitTime));
      this.actionCount = 0;
      this.actionWindowStart = Date.now();
    }
  }

  // ═══════════════════════════════════════════
  //  AIM & TARGETING — No robotic precision
  // ═══════════════════════════════════════════

  /**
   * Add gaussian noise (Box-Muller transform)
   */
  addNoise(value, sigma = 0.05) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return value + z * sigma;
  }

  /**
   * Imperfect aim — add noise scaled by energy and fatigue
   */
  imperfectAim(yaw, pitch) {
    const baseFactor = 1 - (this.config.imperfectAim || 0.82);
    // More tired = less precise
    const fatigueBonus = this.fatigueAccum * 0.3;
    // Startled = more jittery
    const startledBonus = this.mood === 'startled' ? 0.1 : 0;
    const factor = baseFactor + fatigueBonus + startledBonus;

    const noiseYaw = this.addNoise(yaw, factor * Math.PI);
    const noisePitch = this.addNoise(pitch, factor * Math.PI / 4);
    return { yaw: noiseYaw, pitch: noisePitch };
  }

  // ═══════════════════════════════════════════
  //  MOVEMENT PRIMITIVES
  // ═══════════════════════════════════════════

  /**
   * Micro-stop — humans occasionally pause mid-walk
   * More likely when bored or tired
   */
  async maybeMicroStop() {
    const chance = this.config.microStopChance || 0.05;
    const boredBonus = this.boredom * 0.05;
    if (Math.random() < chance + boredBonus) {
      await this.delay(200, 2000);
    }
  }

  /**
   * Smooth Bezier interpolation for natural turning
   * Not linear — humans accelerate and decelerate their head turns
   */
  bezierInterp(start, end, t) {
    const offset = (Math.random() - 0.5) * 0.4;
    const mid = (start + end) / 2 + offset;
    const u = 1 - t;
    return u * u * start + 2 * u * t * mid + t * t * end;
  }

  /**
   * Smooth turning — like a human moving their head
   * Variable speed, slight overshoot, settle
   */
  async smoothTurn(bot, targetYaw, targetPitch, steps = 8) {
    const startYaw = bot.entity.yaw;
    const startPitch = bot.entity.pitch;

    // Turn speed varies with mood
    const speedMult = this.mood === 'startled' ? 0.5 : 
                      this.mood === 'tired' ? 2.0 : 1.0;

    for (let i = 1; i <= steps; i++) {
      // Ease-in-ease-out (accelerate then decelerate)
      const rawT = i / steps;
      const t = rawT < 0.5 
        ? 2 * rawT * rawT 
        : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      const yaw = this.bezierInterp(startYaw, targetYaw, t);
      const pitch = this.bezierInterp(startPitch, targetPitch, t);
      bot.look(yaw, pitch, false);
      await this.delay(25 * speedMult, 70 * speedMult);
    }

    // Slight overshoot + settle (humans don't stop exactly on target)
    if (Math.random() < 0.3) {
      const overshootYaw = targetYaw + (Math.random() - 0.5) * 0.1;
      const overshootPitch = targetPitch + (Math.random() - 0.5) * 0.05;
      bot.look(overshootYaw, overshootPitch, false);
      await this.delay(50, 150);
      bot.look(targetYaw, targetPitch, false);
    }
  }

  // ═══════════════════════════════════════════
  //  TYPO SYSTEM — Real typing mistakes
  // ═══════════════════════════════════════════

  /**
   * Introduce a typo — swap, delete, duplicate, or adjacent key
   */
  maybeTypo(text) {
    if (Math.random() > (this.config.typoChance || 0.15) || text.length < 3) {
      return text;
    }

    // Tired = more typos
    if (this.energy < 0.4 && Math.random() < 0.3) {
      // Extra typo chance when tired
    }

    const ops = ['swap', 'delete', 'duplicate', 'adjacent'];
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
      case 'adjacent':
        // Simulate hitting a nearby key on QWERTY
        const adjacent = {
          'a': 'sq', 's': 'ad', 'd': 'sf', 'f': 'dg', 'g': 'fh',
          'h': 'gj', 'j': 'hk', 'k': 'jl', 'e': 'wr', 'r': 'et',
          't': 'ry', 'y': 'tu', 'u': 'yi', 'i': 'uo', 'o': 'ip',
          'n': 'bm', 'm': 'n,', 'l': 'k;', 'w': 'eq',
        };
        const lower = text[pos].toLowerCase();
        if (adjacent[lower]) {
          const replacements = adjacent[lower];
          const replacement = replacements[Math.floor(Math.random() * replacements.length)];
          return text.slice(0, pos) + replacement + text.slice(pos + 1);
        }
        break;
    }
    return text;
  }

  // ═══════════════════════════════════════════
  //  HUMAN BEHAVIORS — Things real players do
  // ═══════════════════════════════════════════

  /**
   * Hotbar scroll — humans cycle through items aimlessly
   */
  async maybeScrollHotbar(bot) {
    if (Math.random() < (this.config.hotbarScrollChance || 0.08)) {
      const scrolls = this.randInt(1, 4);
      for (let i = 0; i < scrolls; i++) {
        const slot = this.randInt(0, 8);
        bot.setQuickBarSlot(slot);
        await this.delay(100, 400);
      }
    }
  }

  /**
   * Sneak-peek — press shift briefly (looking over edge, etc.)
   */
  async maybeSneakPeek(bot) {
    if (Math.random() < (this.config.sneakPeekChance || 0.04)) {
      bot.setControlState('sneak', true);
      await this.delay(500, 2000);
      bot.setControlState('sneak', false);
    }
  }

  /**
   * Fidget with held item — right-click then cancel
   */
  async maybeFidgetItem(bot) {
    if (Math.random() < (this.config.fidgetWithItemChance || 0.06)) {
      bot.activateItem();
      await this.delay(200, 600);
      bot.deactivateItem();
    }
  }

  /**
   * Open inventory briefly then close (checking items)
   */
  async maybeCheckInventory(bot) {
    if (Math.random() < (this.config.openCloseInventoryChance || 0.04)) {
      // Open and close creative inventory / regular inventory
      // This creates the arm swing animation
      bot.activateItem();
      await this.delay(800, 2500);
      bot.deactivateItem();
    }
  }

  /**
   * Double-take — look at something, look away, then look back
   * Extremely human behavior
   */
  async maybeDoubleTake(bot, targetYaw, targetPitch) {
    if (Math.random() < (this.config.doubleTakeChance || 0.02)) {
      // First glance
      await this.smoothTurn(bot, targetYaw, targetPitch, 4);
      await this.delay(200, 600);
      // Look away
      const awayYaw = targetYaw + (Math.random() - 0.5) * 1.5;
      await this.smoothTurn(bot, awayYaw, targetPitch, 3);
      await this.delay(300, 800);
      // Look back (the double-take)
      await this.smoothTurn(bot, targetYaw, targetPitch, 5);
    }
  }

  /**
   * Nervous look-around — scan surroundings quickly
   * Happens in dark areas, after damage, or when alone
   */
  async nervousLookAround(bot) {
    if (Math.random() < (this.config.nervousLookAroundChance || 0.03)) {
      const turns = this.randInt(3, 6);
      for (let i = 0; i < turns; i++) {
        const randomYaw = Math.random() * Math.PI * 2;
        const randomPitch = (Math.random() - 0.5) * Math.PI / 2;
        await this.smoothTurn(bot, randomYaw, randomPitch, 3);
        await this.delay(100, 400);
      }
    }
  }

  /**
   * Stare at a player — humans make eye contact
   */
  shouldStareAtPlayer() {
    return Math.random() < (this.config.stareAtPlayerChance || 0.15);
  }

  // ═══════════════════════════════════════════
  //  AFK & SESSION SIMULATION
  // ═══════════════════════════════════════════

  shouldAFK() {
    return Math.random() < (this.config.afkChance || 0.06);
  }

  async randomAFKDuration() {
    const min = this.config.afkDurationMin || 15000;
    const max = this.config.afkDurationMax || 180000;
    const duration = min + Math.random() * (max - min);
    return new Promise((r) => setTimeout(r, duration));
  }

  // ═══════════════════════════════════════════
  //  INTERNAL STATE — Mood, energy, boredom
  // ═══════════════════════════════════════════

  _startMoodCycles() {
    // Mood shifts every 5-20 minutes
    setInterval(() => {
      const moods = ['neutral', 'neutral', 'neutral', 'curious', 'tired', 'bored', 'social', 'focused'];
      this.mood = this.pick(moods);
      // Recover energy when in 'neutral' or 'focused' mood
      if (this.mood === 'neutral' || this.mood === 'focused') {
        this.energy = Math.min(1, this.energy + 0.1);
      }
      // Drain energy when tired
      if (this.mood === 'tired') {
        this.energy = Math.max(0, this.energy - 0.15);
      }
    }, 300000 + Math.random() * 900000);

    // Curiosity shifts
    setInterval(() => {
      this.curiosity = Math.max(0.1, Math.min(0.9, this.curiosity + (Math.random() - 0.5) * 0.3));
    }, 60000 + Math.random() * 180000);

    // Social energy drains with interaction, recovers in solitude
    setInterval(() => {
      this.socialEnergy = Math.min(1, this.socialEnergy + 0.05); // Slow recovery
    }, 120000);

    // Boredom accumulation
    setInterval(() => {
      this.boredom = Math.min(1, this.boredom + 0.02);
    }, 30000);
  }

  /**
   * Reset boredom — call when something interesting happens
   */
  onInterestingEvent() {
    this.boredom = 0;
    if (this.mood === 'bored') this.mood = 'neutral';
  }

  /**
   * Drain social energy — call after social interaction
   */
  onSocialInteraction() {
    this.socialEnergy = Math.max(0, this.socialEnergy - 0.15);
  }

  /**
   * Get startled — call when taking damage
   */
  getStartled() {
    this.mood = 'startled';
    this.onInterestingEvent();
    // Recover from startle after a few seconds
    setTimeout(() => {
      if (this.mood === 'startled') this.mood = 'nervous';
    }, 3000 + Math.random() * 5000);
  }

  // ═══════════════════════════════════════════
  //  UTILITY
  // ═══════════════════════════════════════════

  chance(probability = 0.5) {
    return Math.random() < probability;
  }

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  randInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  /**
   * Get current internal state (for debugging)
   */
  getState() {
    return {
      mood: this.mood,
      energy: this.energy.toFixed(2),
      curiosity: this.curiosity.toFixed(2),
      socialEnergy: this.socialEnergy.toFixed(2),
      boredom: this.boredom.toFixed(2),
      fatigue: this.fatigueAccum.toFixed(3),
      apm: this.actionCount,
    };
  }
}

module.exports = HumannessLayer;
