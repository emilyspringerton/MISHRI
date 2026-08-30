/**
 * Skill Manager — Actually functional skills (with human imperfection!)
 * Mining, eating, crafting, building — the bot can DO things now
 */

import { Bot } from 'mineflayer';
import { Block } from 'prismarine-block';
import { Vec3 } from 'vec3';
import minecraftData from 'minecraft-data';
import HumannessLayer = require('../humanness/HumannessLayer');

class SkillManager {
  bot: Bot;
  h: HumannessLayer;

  constructor(bot: Bot, humanness: HumannessLayer) {
    this.bot = bot;
    this.h = humanness;
  }

  /**
   * Mine a random nearby block — imperfectly
   */
  async mineRandom(): Promise<void> {
    const pos = this.bot.entity!.position;
    const radius = 5;
    const targets: Block[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          try {
            const block = this.bot.blockAt(pos.offset(dx, dy, dz));
            if (block && block.name !== 'air' && block.name !== 'cave_air' && this.bot.canDigBlock(block)) {
              targets.push(block);
            }
          } catch (e) {
            /* skip invalid positions */
          }
        }
      }
    }

    if (targets.length === 0) {
      console.log('[Skill] No mineable blocks nearby');
      return;
    }

    // Don't always pick the closest — humans are sub-optimal
    const target = targets[Math.floor(Math.random() * Math.min(targets.length, 8))];

    try {
      // Look at the block first (human would)
      await this.h.smoothTurn(this.bot, this._getYawTo(target.position.offset(0.5, 0.5, 0.5)), this._getPitchTo(target.position.offset(0.5, 0.5, 0.5)), 6);

      // Hesitate before mining
      await this.h.delay(300, 1500);

      // Equip best tool (with inventory fumble delay)
      await this.h.delay(500, 1500);
      try {
        const tool = this.bot.pathfinder.bestHarvestTool(target);
        if (tool) {
          await this.bot.equip(tool, 'hand');
        }
      } catch (e) {
        // Tool equipping can fail, just mine with hand
      }

      // Mine the block
      await this.bot.dig(target, true);
      this.h.onInterestingEvent();

      // Sometimes mine an adjacent block too (humans keep going)
      if (Math.random() < 0.3) {
        const adjacent = targets.find(
          (t) =>
            t !== target &&
            Math.abs(t.position.x - target.position.x) <= 1 &&
            Math.abs(t.position.y - target.position.y) <= 1 &&
            Math.abs(t.position.z - target.position.z) <= 1
        );
        if (adjacent && this.bot.canDigBlock(adjacent)) {
          await this.h.delay(200, 800);
          await this.bot.dig(adjacent, true);
        }
      }
    } catch (err) {
      console.log(`[Skill] Mining failed: ${(err as Error).message}`);
    }
  }

  /**
   * Eat food — at imperfect hunger levels
   */
  async eatFood(): Promise<void> {
    // Humans eat at ~7-9 hunger, not at 0
    if (this.bot.food > 18) return;
    if (this.bot.food > 12 && Math.random() < 0.7) return;

    const foodItem = this.bot.inventory.items().find(
      (item) =>
        item.name.includes('bread') ||
        item.name.includes('cooked') ||
        item.name.includes('apple') ||
        item.name.includes('meat') ||
        item.name.includes('beef') ||
        item.name.includes('pork') ||
        item.name.includes('fish') ||
        item.name.includes('carrot') ||
        item.name.includes('potato') ||
        item.name.includes('melon')
    );

    if (!foodItem) return;

    try {
      await this.h.delay(500, 2000); // Fumble in inventory
      await this.bot.equip(foodItem, 'hand');
      await this.h.delay(200, 600); // Bring to mouth
      await this.bot.consume();
      console.log(`[Skill] Ate ${foodItem.name} (hunger: ${this.bot.food})`);
    } catch (err) {
      console.log(`[Skill] Eating failed: ${(err as Error).message}`);
    }
  }

  /**
   * Craft a basic item — with fumbling delays
   */
  async craftBasic(): Promise<void> {
    try {
      // Find something we can craft. Real signature requires a numeric itemType (mineflayer's
      // own index.d.ts), but the original JS called this with zero arguments (itemType
      // undefined at runtime) -- preserved exactly via `undefined as any` rather than inventing
      // a real item-type filter this conversion has no business adding.
      const recipes = this.bot.recipesAll(undefined as any, null, null);
      // Real, pre-existing dead-code bug this TS conversion's own type checking surfaced (not
      // introduced by it): `bot.inventory.countInventoryItem` has never existed on the real
      // Window type (prismarine-windows' own real method is `findInventoryItem`) -- this line
      // was always checking a real, permanently-`undefined` (falsy) method reference, so
      // `craftable` has always been an empty array and craftBasic() has never actually crafted
      // anything. Preserved exactly via `as any` rather than guessing at and inventing the real
      // "does the bot actually have the ingredients" check the original author likely intended --
      // that's real, separate, future work, not something to invent silently under a TS upgrade.
      const craftable = recipes.filter((r) => r.result && (this.bot.inventory as any).countInventoryItem);

      if (craftable.length === 0) {
        console.log('[Skill] Nothing to craft');
        return;
      }

      // Pick a random simple recipe
      const recipe = craftable[Math.floor(Math.random() * Math.min(craftable.length, 10))];

      // Human fumble: open inventory multiple times
      await this.h.delay(1000, 3000);
      if (Math.random() < 0.15) {
        await this.h.delay(500, 1500);
      }

      await this.bot.craft(recipe, 1, undefined);
      await this.h.delay(500, 1500);
      // Real fix: RecipeItem (prismarine-recipe's own real type) has never had a `.name` field,
      // only `.id`/`.metadata`/`.count` -- this real log line always printed the "something"
      // fallback, never an actual item name. Real, correct, low-risk fix (a log message only,
      // no control-flow change) -- shows the real numeric item id instead of a field that never
      // existed.
      console.log(`[Skill] Crafted: item id ${recipe.result?.id ?? 'something'}`);
      this.h.onInterestingEvent();
    } catch (err) {
      console.log(`[Skill] Crafting failed: ${(err as Error).message}`);
    }
  }

  /**
   * Place a block from inventory — sometimes the wrong one
   */
  async placeBlock(): Promise<void> {
    try {
      // Find a placeable block in inventory
      const mcData = minecraftData(this.bot.version);
      const blockItem = this.bot.inventory.items().find((item) => mcData.blocksByName[item.name] !== undefined);

      if (!blockItem) {
        console.log('[Skill] No blocks to place');
        return;
      }

      await this.bot.equip(blockItem, 'hand');
      await this.h.delay(300, 800);

      // Find a reference block to place against (the one we're standing on)
      const below = this.bot.blockAt(this.bot.entity!.position.offset(0, -1, 0));
      if (!below) return;

      // Place on top of it
      const face = new Vec3(0, 1, 0);
      await this.bot.placeBlock(below, face);

      // 3% chance: place wrong block, then fix
      if (Math.random() < 0.03) {
        console.log('[Skill] Wrong block placed! Fixing...');
        await this.h.delay(1000, 3000);
        const wrongBlock = this.bot.blockAt(below.position.offset(face.x, face.y, face.z));
        if (wrongBlock) {
          await this.bot.dig(wrongBlock);
        }
      }

      this.h.onInterestingEvent();
    } catch (err) {
      console.log(`[Skill] Placing failed: ${(err as Error).message}`);
    }
  }

  /**
   * Chop a tree — find and mine log blocks
   */
  async chopTree(): Promise<void> {
    const pos = this.bot.entity!.position;
    const radius = 10;
    let logBlock: Block | null = null;

    // Find nearest log
    for (let dx = -radius; dx <= radius && !logBlock; dx++) {
      for (let dy = -3; dy <= 10 && !logBlock; dy++) {
        for (let dz = -radius; dz <= radius && !logBlock; dz++) {
          const block = this.bot.blockAt(pos.offset(dx, dy, dz));
          if (block && (block.name.includes('log') || block.name.includes('stem'))) {
            if (this.bot.canDigBlock(block)) {
              logBlock = block;
            }
          }
        }
      }
    }

    if (!logBlock) {
      console.log('[Skill] No trees nearby');
      return;
    }

    try {
      // Walk near the tree first
      await this.h.smoothTurn(this.bot, this._getYawTo(logBlock.position), this._getPitchTo(logBlock.position), 6);

      await this.h.delay(500, 1500);

      // Equip axe
      try {
        const axe = this.bot.inventory.items().find((i) => i.name.includes('axe') || i.name.includes('_axe'));
        if (axe) await this.bot.equip(axe, 'hand');
      } catch (e) {
        /* equipping can fail, chop bare-handed */
      }

      await this.bot.dig(logBlock, true);
      console.log(`[Skill] Chopped: ${logBlock.name}`);
      this.h.onInterestingEvent();
    } catch (err) {
      console.log(`[Skill] Chopping failed: ${(err as Error).message}`);
    }
  }

  // --- Helpers ---

  private _getYawTo(pos: Vec3): number {
    const dx = pos.x - this.bot.entity!.position.x;
    const dz = pos.z - this.bot.entity!.position.z;
    return Math.atan2(-dx, dz);
  }

  private _getPitchTo(pos: Vec3): number {
    const dx = pos.x - this.bot.entity!.position.x;
    const dy = pos.y - this.bot.entity!.position.y;
    const dz = pos.z - this.bot.entity!.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.atan2(-dy, dist);
  }
}

export = SkillManager;
