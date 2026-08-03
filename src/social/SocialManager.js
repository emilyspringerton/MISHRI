/**
 * Social Manager — Chat like a real person
 * Typos, delays, ignoring messages, personality
 */

class SocialManager {
  constructor(bot, humanness, config) {
    this.bot = bot;
    this.h = humanness;
    this.personality = config.personality;
    this.llmConfig = config.llm;
    this.chatHistory = [];
    this.lastResponse = 0;
    this.conversationalMemory = new Map(); // player -> [messages]
  }

  /**
   * Handle incoming chat
   */
  async onChat(username, message) {
    // Store in history
    this.chatHistory.push({ username, message, time: Date.now() });
    if (this.chatHistory.length > 100) this.chatHistory.shift();

    // Store in conversational memory
    if (!this.conversationalMemory.has(username)) {
      this.conversationalMemory.set(username, []);
    }
    this.conversationalMemory.get(username).push(message);

    // Maybe ignore — humans don't respond to everything
    if (Math.random() < this.h.config.ignoreChatChance) return;

    // Detect if message is directed at us
    const directed = this._isDirectedAtUs(username, message);
    if (!directed && Math.random() < 0.7) return; // 70% chance to ignore undirected

    // React with human-like delay
    await this.h.chatDelay();

    if (directed) {
      await this._respondToDirected(username, message);
    } else {
      await this._reactToGeneral(username, message);
    }
  }

  /**
   * Check if a message seems directed at Mishri
   */
  _isDirectedAtUs(username, message) {
    const lower = message.toLowerCase();
    const name = this.bot.username.toLowerCase();
    return (
      lower.includes(name) ||
      lower.includes('@' + name) ||
      lower.endsWith('?') && this._isNearby(username)
    );
  }

  /**
   * Check if a player is nearby
   */
  _isNearby(username) {
    const player = this.bot.players[username];
    if (!player?.entity) return false;
    return this.bot.entity.position.distanceTo(player.entity.position) < 16;
  }

  /**
   * Respond to a directed message
   */
  async _respondToDirected(username, message) {
    const lower = message.toLowerCase();

    // Greeting detection
    if (/^(hey|hi|yo|sup|hello|hola)/i.test(lower)) {
      const greeting = this.h.pick(this.personality.greetings);
      await this._sendChat(`${greeting} ${username}`);
      return;
    }

    // Farewell detection
    if (/\b(bye|cya|later|gg|goodnight|gn)\b/i.test(lower)) {
      const farewell = this.h.pick(this.personality.farewells);
      await this._sendChat(farewell);
      return;
    }

    // Question detection
    if (lower.includes('?')) {
      await this._answerQuestion(username, message);
      return;
    }

    // Generic acknowledgment
    const acks = ['nice', 'ok', 'cool', 'lol', 'yeah', 'true', 'mhm', 'wdym'];
    await this._sendChat(this.h.pick(acks));
  }

  /**
   * React to general (non-directed) chat
   */
  async _reactToGeneral(username, message) {
    const lower = message.toLowerCase();

    // React to deaths, achievements, etc.
    if (lower.includes('died') || lower.includes('rip')) {
      await this._sendChat('F');
      return;
    }

    if (lower.includes('found diamond') || lower.includes('got diamond')) {
      await this._sendChat(this.h.pick(['nice!', 'lucky', 'gg', 'wow']));
      return;
    }

    // Rarely add something to general conversation
    if (Math.random() < 0.15) {
      const reactions = ['lol', 'true', 'fr', 'same', 'relatable'];
      await this._sendChat(this.h.pick(reactions));
    }
  }

  /**
   * Answer a question — try LLM first, then fallback
   */
  async _answerQuestion(username, message) {
    if (this.llmConfig.enabled) {
      try {
        const response = await this._queryLLM(username, message);
        await this._sendChat(response);
        return;
      } catch (err) {
        console.log(`[Social] LLM failed: ${err.message}`);
      }
    }

    // Fallback: vague response (doesn't reveal bot nature)
    const vague = [
      'idk', 'not sure', 'maybe?', 'hmm', 'good question',
      'no idea lol', 'probably', 'i think so', 'maybe not?',
    ];
    await this._sendChat(this.h.pick(vague));
  }

  /**
   * Query LLM for chat response
   */
  async _queryLLM(username, message) {
    const fetch = (await import('node-fetch')).default;
    const context = this.conversationalMemory.get(username)?.slice(-5) || [];

    const response = await fetch(`${this.llmConfig.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.llmConfig.model,
        prompt: `You are Mishri, a casual Minecraft player. Respond briefly and casually. Recent chat: ${context.join(', ')}. ${username} says: ${message}`,
        stream: false,
        options: { num_predict: this.llmConfig.maxTokens },
      }),
    });

    const data = await response.json();
    return data.response?.trim().substring(0, 100) || 'idk';
  }

  /**
   * Send chat with possible typo + correction
   */
  async _sendChat(text) {
    await this.h.throttleAPM();

    // Maybe add a typo
    let finalText = this.h.maybeTypo(text);

    // If we made a typo, sometimes "correct" it
    if (finalText !== text && Math.random() < 0.6) {
      this.bot.chat(finalText);
      await this.h.delay(800, 2500);
      this.bot.chat(`${text}*`); // Correction with asterisk
    } else {
      this.bot.chat(finalText);
    }

    this.chatHistory.push({ username: this.bot.username, message: text, time: Date.now() });
  }

  /**
   * Maybe greet when joining
   */
  maybeGreet() {
    if (Math.random() < 0.6) {
      const greeting = this.h.pick(this.personality.greetings);
      this.bot.chat(greeting);
    }
  }
}

module.exports = SocialManager;
