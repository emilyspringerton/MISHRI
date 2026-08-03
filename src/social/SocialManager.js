/**
 * Social Manager — Chat like a REAL person
 * Typos with adjacent-key mistakes, typing indicators,
 * ignoring messages, personality moods, contextual responses
 */

class SocialManager {
  constructor(bot, humanness, config) {
    this.bot = bot;
    this.h = humanness;
    this.personality = config.personality;
    this.llmConfig = config.llm;
    this.chatHistory = [];
    this.lastResponse = 0;
    this.conversationalMemory = new Map();
    this.recentTopics = [];
  }

  /**
   * Handle incoming chat
   */
  async onChat(username, message) {
    this.chatHistory.push({ username, message, time: Date.now() });
    if (this.chatHistory.length > 100) this.chatHistory.shift();

    if (!this.conversationalMemory.has(username)) {
      this.conversationalMemory.set(username, []);
    }
    this.conversationalMemory.get(username).push(message);

    // Skip if we just responded (humans don't reply to every message)
    if (Date.now() - this.lastResponse < 5000) return;

    // Maybe ignore entirely — humans don't respond to everything
    const ignoreChance = this.h.config.ignoreChatChance || 0.35;
    if (Math.random() < ignoreChance) return;

    // Low social energy = less likely to engage
    if (this.h.socialEnergy < 0.3 && Math.random() < 0.7) return;

    // Detect direction
    const directed = this._isDirectedAtUs(username, message);
    if (!directed && Math.random() < 0.75) return; // 75% ignore undirected

    // React with human-like delay
    await this.h.chatDelay();
    this.h.onSocialInteraction();

    if (directed) {
      await this._respondToDirected(username, message);
    } else {
      await this._reactToGeneral(username, message);
    }

    this.lastResponse = Date.now();
  }

  /**
   * Check if message is directed at Mishri
   */
  _isDirectedAtUs(username, message) {
    const lower = message.toLowerCase();
    const name = this.bot.username.toLowerCase();
    return (
      lower.includes(name) ||
      lower.includes('@' + name) ||
      (lower.endsWith('?') && this._isNearby(username) && Math.random() < 0.5)
    );
  }

  _isNearby(username) {
    const player = this.bot.players[username];
    if (!player?.entity) return false;
    return this.bot.entity.position.distanceTo(player.entity.position) < 16;
  }

  /**
   * Respond to directed message
   */
  async _respondToDirected(username, message) {
    const lower = message.toLowerCase();

    // Greeting
    if (/^(hey|hi|yo|sup|hello|hola|heya|hii)\b/i.test(lower)) {
      const greeting = this.h.pick(this.personality.greetings);
      await this._sendChat(`${greeting} ${username}`);
      return;
    }

    // How are you
    if (/how\s*(are|r)\s*(u|you)|how'?s?\s*it\s*going|what'?s?\s*up/i.test(lower)) {
      const responses = [
        'good wbu', 'not bad', 'chilling', 'tired ngl', 'im good hbu',
        'surviving lol', 'could be worse', 'just vibing'
      ];
      await this._sendChat(this.h.pick(responses));
      return;
    }

    // Farewell
    if (/\b(bye|cya|later|gg|goodnight|gn|peace|im\s*out)\b/i.test(lower)) {
      const farewell = this.h.pick(this.personality.farewells);
      await this._sendChat(farewell);
      return;
    }

    // What are you doing
    if (/what\s*(are|r)\s*(u|you)\s*doing|wyd|what'?s?\s*up/i.test(lower)) {
      const doing = [
        'just mining', 'wandering around', 'building stuff', 'not much tbh',
        'looking for diamonds', 'exploring', 'chilling at base', 'grinding'
      ];
      await this._sendChat(this.h.pick(doing));
      return;
    }

    // Question
    if (lower.includes('?')) {
      await this._answerQuestion(username, message);
      return;
    }

    // Compliment
    if (/\b(nice|cool|awesome|gg|good\s*job|well\s*done)\b/i.test(lower)) {
      const thanks = ['ty', 'thanks', 'thx', 'appreciate it', 'no cap'];
      await this._sendChat(this.h.pick(thanks));
      return;
    }

    // Generic acknowledgment
    const acks = this.personality.acknowledgments || ['nice', 'ok', 'cool', 'lol', 'yeah'];
    await this._sendChat(this.h.pick(acks));
  }

  /**
   * React to general (non-directed) chat
   */
  async _reactToGeneral(username, message) {
    const lower = message.toLowerCase();

    if (/\b(died|rip|dead|killed|lost\s*everything)\b/i.test(lower)) {
      await this._sendChat('F');
      return;
    }

    if (/\b(found?\s*diamond|diamonds?|got\s*diamond)\b/i.test(lower)) {
      await this._sendChat(this.h.pick(['nice!', 'lucky', 'gg', 'wow', 'congrats']));
      return;
    }

    if (/\b(anyone|any1|somebody|who)\b/i.test(lower) && lower.includes('?')) {
      // Someone asking if anyone is around — sometimes respond
      if (Math.random() < 0.3) {
        await this._sendChat('me');
      }
      return;
    }

    // Very rarely add to conversation
    if (Math.random() < 0.1) {
      const reactions = ['lol', 'true', 'fr', 'same', 'relatable', 'big true', 'ngl'];
      await this._sendChat(this.h.pick(reactions));
    }
  }

  /**
   * Answer a question
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

    const vague = [
      'idk', 'not sure tbh', 'maybe?', 'hmm', 'good question',
      'no idea lol', 'probably', 'i think so', 'maybe not?',
      'who knows', 'wouldnt bet on it', 'yea probably'
    ];
    await this._sendChat(this.h.pick(vague));
  }

  /**
   * Query LLM
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
   * Send chat with typo + possible correction
   */
  async _sendChat(text) {
    await this.h.throttleAPM();

    let finalText = this.h.maybeTypo(text);

    // Typo + correction pattern (like real players)
    if (finalText !== text && Math.random() < (this.h.config.typoCorrectChance || 0.6)) {
      this.bot.chat(finalText);
      await this.h.delay(800, 3000);
      this.bot.chat(`${text}*`);
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
