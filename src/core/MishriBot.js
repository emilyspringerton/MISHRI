/**
 * Mishri — Human-like Minecraft Bot
 * Main entry point
 */

const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder');
const autoEat = require('mineflayer-auto-eat');
const collectBlock = require('mineflayer-collectblock');
const pvp = require('mineflayer-pvp');
const toolPlugin = require('mineflayer-tool');

const config = require('../config/default.json');
const HumannessLayer = require('./humanness');
const MovementManager = require('../movement');
const PerceptionManager = require('../perception');
const SocialManager = require('../social');
const BehaviorOrchestrator = require('../behavior');
const SkillManager = require('../skills');

class MishriBot {
  constructor(overrides = {}) {
    this.config = { ...config, ...overrides };
    this.bot = null;
    this.running = false;

    // Sub-systems
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
  connect() {
    console.log(`[Mishri] Connecting as ${this.config.bot.username}...`);

    this.bot = mineflayer.createBot({
      host: this.config.server.host,
      port: this.config.server.port,
      username: this.config.bot.username,
      password: this.config.bot.password,
      auth: this.config.bot.auth,
      version: this.config.server.version,
      hideErrors: false,
    });

    // Load plugins
    this.bot.loadPlugin(pathfinder.pathfinder);
    this.bot.loadPlugin(autoEat.plugin);
    this.bot.loadPlugin(collectBlock.plugin);
    this.bot.loadPlugin(pvp.plugin);
    this.bot.loadPlugin(toolPlugin);

    // Initialize sub-systems with bot reference
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
  _registerEvents() {
    this.bot.once('spawn', () => {
      console.log('[Mishri] Spawned in world!');
      this.running = true;
      this._onSpawn();
    });

    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return;
      this.social.onChat(username, message);
    });

    this.bot.on('health', () => {
      this.perception.onHealthChange();
    });

    this.bot.on('entityHurt', (entity) => {
      this.perception.onEntityHurt(entity);
    });

    this.bot.on('entitySwing', (entity) => {
      this.perception.onEntitySwing(entity);
    });

    this.bot.on('kicked', (reason) => {
      console.log(`[Mishri] Kicked: ${reason}`);
      this.running = false;
    });

    this.bot.on('error', (err) => {
      console.log(`[Mishri] Error: ${err.message}`);
    });

    this.bot.on('end', () => {
      console.log('[Mishri] Disconnected.');
      this.running = false;
    });

    this.bot.on('death', () => {
      this._onDeath();
    });
  }

  /**
   * Called when the bot spawns — start all systems
   */
  async _onSpawn() {
    // Greet with delay
    await this.humanness.delay(2000, 5000);
    this.social.maybeGreet();

    // Start the behavior loop
    this.behavior.start();

    // Start the perception look-around loop
    this.perception.startLookLoop();

    // Start AFK simulation
    this.behavior.startAFKSimulator();

    console.log('[Mishri] All systems online. Blending in...');
  }

  /**
   * Handle death like a human
   */
  async _onDeath() {
    console.log('[Mishri] Died! Respawning...');
    await this.humanness.delay(1000, 4000);
    this.bot.chat('rip');
    await this.humanness.delay(500, 2000);
    this.bot.respawn();
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.running = false;
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

  process.on('SIGINT', () => {
    bot.disconnect();
    process.exit(0);
  });
}

module.exports = MishriBot;
