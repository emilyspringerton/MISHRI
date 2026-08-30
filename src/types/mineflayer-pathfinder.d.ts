// mineflayer-pathfinder.d.ts — real, minimal ambient type shim for `mineflayer-pathfinder`.
//
// Unlike mineflayer-auto-eat/collectblock/pvp/tool (all of which ship their own real .d.ts, per
// `npm view <pkg> types`), mineflayer-pathfinder does not, and there's no @types/mineflayer-
// pathfinder on DefinitelyTyped either (confirmed live: `npm view @types/mineflayer-pathfinder`
// 404s). This shim covers only the real surface this codebase actually calls
// (`pathfinder.pathfinder`, `goals.GoalNear`, `bot.pathfinder.setGoal`/`bestHarvestTool`) --
// not a full, exhaustive re-typing of the whole plugin.
//
// Real, found-live gotcha: `export {}` below is load-bearing, not decorative. Without at least
// one top-level import/export, TypeScript treats this whole file as a global ambient SCRIPT, not
// a module -- which makes the `declare module 'mineflayer' { interface Bot {...} }` augmentation
// further down REPLACE mineflayer's own real Bot interface entirely instead of merging with it
// (confirmed live: every other real property on Bot -- entity, chat, blockAt, inventory, all of
// it -- silently vanished, "Property 'entity' does not exist on type 'Bot'", until this line was
// added).
export {};

declare module 'mineflayer-pathfinder' {
  import { Bot } from 'mineflayer';

  export function pathfinder(bot: Bot): void;

  export class Movements {
    constructor(bot: Bot);
  }

  export class Goal {}

  export class GoalNear extends Goal {
    constructor(x: number, y: number, z: number, range: number);
  }

  export const goals: {
    Goal: typeof Goal;
    GoalNear: typeof GoalNear;
  };
}

// Real module augmentation -- mineflayer's own Bot interface doesn't know about the
// pathfinder plugin's own real, injected `bot.pathfinder` property until a plugin's consumer
// declares it (same real reason mineflayer-auto-eat/collectblock/pvp/tool's own shipped .d.ts
// files do the exact same kind of augmentation for their own injected properties).
declare module 'mineflayer' {
  interface Bot {
    pathfinder: {
      setGoal(goal: import('mineflayer-pathfinder').Goal | null, dynamic?: boolean): void;
      setMovements(movements: import('mineflayer-pathfinder').Movements): void;
      bestHarvestTool(block: import('prismarine-block').Block): import('prismarine-item').Item | null;
      goto(goal: import('mineflayer-pathfinder').Goal): Promise<void>;
    };
  }
}
