// config.ts — real, shared config shape, matching config/default.json field-for-field. Not
// exhaustively re-derived from JSON Schema (this repo has none) -- typed by hand against the
// real, checked-in default.json, same discipline every other real type in this conversion uses.

export interface HumannessConfig {
  reactionDelayMin?: number;
  reactionDelayMax?: number;
  chatDelayMin?: number;
  chatDelayMax?: number;
  typoChance?: number;
  typoCorrectChance?: number;
  ignoreChatChance?: number;
  lookWanderIntervalMin: number;
  lookWanderIntervalMax: number;
  afkChance?: number;
  afkDurationMin?: number;
  afkDurationMax?: number;
  microStopChance?: number;
  imperfectAim?: number;
  maxAPM?: number;
  lookAheadChance?: number;
  stretchChance?: number;
  yawnChance?: number;
  hotbarScrollChance?: number;
  sneakPeekChance?: number;
  breathingAmplitude?: number;
  headBobWhileWalking?: boolean;
  nervousLookAroundChance?: number;
  doubleTakeChance?: number;
  stareAtPlayerChance?: number;
  walkSpeedVariation?: number;
  turnSpeedVariation?: number;
  fidgetWithItemChance?: number;
  openCloseInventoryChance?: number;
}

export interface SkinConfig {
  enabled?: boolean;
  url?: string;
  model?: 'classic' | 'slim';
  fallbackUrl?: string;
}

export interface ServerConfig {
  host: string;
  port: number;
  version: string;
}

export interface BotConfig {
  username: string;
  email?: string;
  password?: string;
  auth?: 'offline' | 'microsoft';
}

export interface PersonalityConfig {
  style?: string;
  greetings: string[];
  farewells: string[];
  acknowledgments?: string[];
  chatPrefix?: string;
  emojiUse?: number;
  sentenceLength?: string;
  mood?: string;
  talkativeness?: number;
}

export interface ActivitiesConfig {
  enableMining?: boolean;
  enableBuilding?: boolean;
  enableCombat?: boolean;
  enableSocializing?: boolean;
  enableWandering?: boolean;
  enableFarming?: boolean;
  enableTrading?: boolean;
  wanderRadius?: number;
  sessionDurationMin?: number;
  sessionDurationMax?: number;
}

export interface LlmConfig {
  enabled: boolean;
  provider?: string;
  model?: string;
  baseUrl: string;
  maxTokens?: number;
}

export interface MishriConfig {
  server: ServerConfig;
  bot: BotConfig;
  skin: SkinConfig;
  humanness: HumannessConfig;
  personality: PersonalityConfig;
  activities?: ActivitiesConfig;
  llm: LlmConfig;
}
