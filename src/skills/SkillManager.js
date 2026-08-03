/**
 * Skill Manager — Simulated human skills (with imperfection!)
 * Mining, building, eating, etc. — all done "badly"
 */

class SkillManager {
  constructor(bot, humanness) {
    this.bot = bot;
    this.h = humanness;
  }

  /**
   * Mine a random nearby block — imperfectly
   */
  async mineRandom() {
    // Find a breakable block nearby
    const pos = this.bot.entity.position;
    const radius = 6;
    const targets = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const block = this.bot.blockAt(pos.offset(dx, dy, dz));
          if (block && block.name !== 'air' && this.bot.canDigBlock(block)) {
            targets.push(block);
          }
        }
      }
    }

    if (targets.length === 0) return;

    // Don't always pick the closest — humans are sub-optimal
    const target = targets[Math.floor(Math.random() * Math.min(targets.length, 8))];

    try {
      // Look at the block first (human would)
      await this.h.smoothTurn(
        this.bot,
        this._getYawTo(target.position.offset(0.5, 0.5, 0.5)),
        this._getPitchTo(target.position.offset(0.5, 0.5, 0.5)),
        6
      );

      // Hesitate before mining
      await this.h.delay(300, 1500);

      // Equip best tool (with delay like opening inventory)
      await this.h.delay(500, 1500);
      const tool = this.bot.pathfinder.bestHarvestTool(target);
      if (tool) {
        await this.bot.equip(tool, 'hand');
      }

      // Mine the block
      await this.bot.dig(target, true);

      // Sometimes miss and hit the wrong block (5% chance)
      if (Math.random() < 0.05 && targets.length > 1) {
        const wrongTarget = this.h.pick(targets.filter((t) => t !== target));
        if (wrongTarget && this.bot.canDigBlock(wrongTarget)) {
          console.log('[Skill] Oops, mining wrong block!');
          await this.bot.dig(wrongTarget, true);
        }
      }

    } catch (err) {
      // Mining failed — just move on like a human would
      console.log(`[Skill] Mining failed: ${err.message}`);
    }
  }

  /**
   * Eat food — at imperfect hunger levels
   */
  async eatFood() {
    // Humans eat at ~7-9 hunger, not at 0
    if (this.bot.food > 18) return; // Not hungry
    if (this.bot.food > 12 && Math.random() < 0.7) return; // Might wait

    const foodItem = this.bot.inventory.items().find((item) =>
      item.name.includes('bread') ||
      item.name.includes('cooked') ||
      item.name.includes('apple') ||
      item.name.includes('meat')
    );

    if (!foodItem) return;

    try {
      await this.h.delay(500, 2000); // Fumble in inventory
      await this.bot.equip(foodItem, 'hand');
      await this.h.delay(200, 600); // Bring to mouth
      await this.bot.consume();
    } catch (err) {
      console.log(`[Skill] Eating failed: ${err.message}`);
    }
  }

  /**
   * Place a block — sometimes the wrong one
   */
  async placeBlock(referenceBlock, face) {
    try {
      await this.h.delay(300, 800); // Placement hesitation
      await this.bot.placeBlock(referenceBlock, face);

      // 3% chance: place wrong block, then fix
      if (Math.random() < 0.03) {
        console.log('[Skill] Wrong block placed! Fixing...');
        await this.h.delay(1000, 3000);
        // Dig it back up
        const wrongBlock = this.bot.blockAt(referenceBlock.position.offset(
          face.x, face.y, face.z
        ));
        if (wrongBlock) {
          await this.bot.dig(wrongBlock);
        }
      }
    } catch (err) {
      console.log(`[Skill] Placing failed: ${err.message}`);
    }
  }

  /**
   * Craft an item — with fumbling delays
   */
  async craftItem(recipe, count = 1) {
    try {
      // Open crafting table (or inventory) with delay
      await this.h.delay(1000, 3000);

      // Humans often open inventory multiple times
      if (Math.random() < 0.15) {
        await this.h.delay(500, 1500);
      }

      await this.bot.craft(recipe, count, null);
      await this.h.delay(500, 1500); // Admire result
    } catch (err) {
      console.log(`[Skill] Crafting failed: ${err.message}`);
    }
  }

  // --- Helpers ---

  _getYawTo(pos) {
    const dx = pos.x - this.bot.entity.position.x;
    const dz = pos.z - this.bot.entity.position.z;
    return Math.atan2(-dx, dz);
  }

  _getPitchTo(pos) {
    const dx = pos.x - this.bot.entity.position.x;
    const dy = pos.y - this.bot.entity.position.y;
    const dz = pos.z - this.bot.entity.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.atan2(-dy, dist);
  }
}

module.exports = SkillManager;
