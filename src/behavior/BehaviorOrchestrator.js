/**
 * Behavior Orchestrator — What should Mishri do right now?
 * Uses utility-based scoring with randomness for unpredictable behavior
 */

class BehaviorOrchestrator {
  constructor(bot, humanness, mishri) {
    this.bot = bot;
    this.h = humanness;
    this.mishri = mishri; // Reference to parent MishriBot
    this.running = false;
    this.currentBehavior = null;
    this.behaviorInterval = null;
    this.afkInterval = null;
    this.lastBehaviorTime = 0;
  }

  /**
   * Start the behavior loop
   */
  start() {
    this.running = true;
    this._behaviorLoop();
  }

  stop() {
    this.running = false;
    if (this.behaviorInterval) clearTimeout(this.behaviorInterval);
    if (this.afkInterval) clearTimeout(this.afkInterval);
  }

  /**
   * Main behavior decision loop
   */
  async _behaviorLoop() {
    if (!this.running) return;

    try {
      // Decide what to do
      const behavior = this._decideBehavior();
      console.log(`[Behavior] Decided: ${behavior.name} (score: ${behavior.score.toFixed(2)})`);

      // Execute with human-like engagement
      this.currentBehavior = behavior.name;
      await behavior.execute();
      this.currentBehavior = null;

    } catch (err) {
      console.log(`[Behavior] Error: ${err.message}`);
      await this.h.delay(2000, 5000);
    }

    // Variable interval between decisions (human-like pacing)
    const nextDelay = 5000 + Math.random() * 20000;
    this.behaviorInterval = setTimeout(() => this._behaviorLoop(), nextDelay);
  }

  /**
   * Utility AI — score each possible behavior and pick the best
   * But add randomness so it's not always the same choice
   */
  _decideBehavior() {
    const behaviors = [
      { name: 'wander', score: this._scoreWander(), execute: () => this._doWander() },
      { name: 'mine', score: this._scoreMine(), execute: () => this._doMine() },
      { name: 'socialize', score: this._scoreSocialize(), execute: () => this._doSocialize() },
      { name: 'idle', score: this._scoreIdle(), execute: () => this._doIdle() },
      { name: 'explore', score: this._scoreExplore(), execute: () => this._doExplore() },
      { name: 'fidget', score: this._scoreFidget(), execute: () => this._doFidget() },
    ];

    // Add random noise to all scores (prevents predictability)
    behaviors.forEach((b) => {
      b.score += (Math.random() - 0.5) * 0.3;
      b.score = Math.max(0, b.score);
    });

    // Sort by score, pick the best
    behaviors.sort((a, b) => b.score - a.score);
    return behaviors[0];
  }

  // --- Scoring Functions ---

  _scoreWander() {
    return 0.4 + Math.random() * 0.2; // Base: always somewhat interested
  }

  _scoreMine() {
    const hasTool = this.bot.inventory.items().some((i) => i.name.includes('pickaxe'));
    return hasTool ? 0.5 + Math.random() * 0.3 : 0.1;
  }

  _scoreSocialize() {
    const nearbyPlayers = this.mishri.perception.getNearbyPlayerCount();
    return nearbyPlayers > 0 ? 0.6 + nearbyPlayers * 0.1 : 0.05;
  }

  _scoreIdle() {
    return 0.3 + Math.random() * 0.2; // Sometimes just... do nothing
  }

  _scoreExplore() {
    return 0.35 + Math.random() * 0.25;
  }

  _scoreFidget() {
    return 0.2 + Math.random() * 0.15; // Subtle fidgeting
  }

  // --- Behavior Executors ---

  async _doWander() {
    if (!this.mishri.movement) return;
    await this.h.reactionDelay();
    await this.mishri.movement.wander(32 + Math.random() * 32);
  }

  async _doMine() {
    if (!this.mishri.skills) return;
    await this.h.reactionDelay();
    await this.mishri.skills.mineRandom();
  }

  async _doSocialize() {
    // Find nearby player and approach
    const players = Object.values(this.bot.entities)
      .filter((e) => e.type === 'player' && e !== this.bot.entity)
      .sort((a, b) =>
        this.bot.entity.position.distanceTo(a.position) -
        this.bot.entity.position.distanceTo(b.position)
      );

    if (players.length > 0) {
      await this.mishri.movement.approachEntity(players[0], 4);
      // Maybe say something
      if (Math.random() < 0.3) {
        const remarks = ['whats up', 'need anything?', 'nice base', 'howdy'];
        this.bot.chat(this.h.pick(remarks));
      }
    }
  }

  async _doIdle() {
    // Do nothing for a while — just exist
    const duration = 3000 + Math.random() * 10000;
    await this.h.delay(duration);

    // Maybe scroll hotbar while idle
    if (Math.random() < 0.4) {
      const slot = this.h.randInt(0, 8);
      this.bot.setQuickBarSlot(slot);
    }
  }

  async _doExplore() {
    if (!this.mishri.movement) return;
    // Explore further than wandering
    await this.mishri.movement.wander(64 + Math.random() * 64);
  }

  async _doFidget() {
    // Small random actions that make us look alive
    const fidgets = [
      () => this.bot.setQuickBarSlot(this.h.randInt(0, 8)),
      () => this.bot.activateItem(), // Right click (use held item)
      () => this.bot.deactivateItem(),
    ];

    const fidget = this.h.pick(fidgets);
    fidget();
    await this.h.delay(200, 800);
  }

  // --- AFK Simulation ---

  startAFKSimulator() {
    const checkAFK = async () => {
      if (this.h.shouldAFK() && !this.currentBehavior) {
        console.log('[Behavior] Going AFK...');
        this.currentBehavior = 'afk';
        await this.h.randomAFKDuration();
        this.currentBehavior = null;
        console.log('[Behavior] Back from AFK');
      }

      // Check again in 1-5 minutes
      const next = 60000 + Math.random() * 240000;
      this.afkInterval = setTimeout(checkAFK, next);
    };

    // First check after 5-15 minutes
    this.afkInterval = setTimeout(checkAFK, 300000 + Math.random() * 600000);
  }
}

module.exports = BehaviorOrchestrator;
