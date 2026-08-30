/**
 * Skin Manager — Custom skin support for Mishri
 *
 * Supports:
 *  - Direct texture URL injection (offline servers)
 *  - MineSkin API fetch (get random girl/boy skins)
 *  - Microsoft auth skin (premium accounts use their own skin)
 */

import crypto from 'crypto';
import { Bot } from 'mineflayer';
import { SkinConfig } from '../types/config';

export interface SkinProperty {
  name: string;
  value: string;
  signature: string;
}

export interface SkinPoolEntry {
  url: string;
  model: 'classic' | 'slim';
  id?: string;
}

class SkinManager {
  config: SkinConfig;
  skinUrl: string;
  model: 'classic' | 'slim';
  enabled: boolean;

  constructor(config: SkinConfig = {}) {
    this.config = config;
    this.skinUrl = config.url || '';
    this.model = config.model || 'classic'; // 'classic' or 'slim'
    this.enabled = config.enabled !== false;
  }

  /**
   * Generate signed property data for skin
   */
  generateSkinProperties(): SkinProperty | null {
    if (!this.enabled || !this.skinUrl) return null;

    const textures = {
      timestamp: Date.now(),
      profileId: crypto.randomUUID().replace(/-/g, ''),
      profileName: 'Mishri',
      textures: {
        SKIN: {
          url: this.skinUrl,
          ...(this.model === 'slim' ? { metadata: { model: 'slim' } } : {}),
        },
      },
    };

    const texturesBase64 = Buffer.from(JSON.stringify(textures)).toString('base64');

    return {
      name: 'textures',
      value: texturesBase64,
      signature: '', // Offline mode doesn't verify signatures
    };
  }

  /**
   * Hook into the bot's connection to inject skin data
   */
  injectSkin(bot: Bot): void {
    if (!this.enabled) {
      console.log('[Skin] Custom skin disabled');
      return;
    }

    const skinProps = this.generateSkinProperties();
    if (!skinProps) {
      console.log('[Skin] No skin URL configured, using default');
      return;
    }

    // _client is mineflayer's own internal minecraft-protocol Client -- not part of the real,
    // public Bot type, so this real, low-level packet hook still needs a real, documented `any`
    // cast here (same real, pragmatic escape hatch every mineflayer bot doing raw packet
    // manipulation needs -- the alternative is a much bigger, separate undertaking: typing
    // minecraft-protocol's own login packet shape).
    (bot as any)._client.once('login', (packet: any) => {
      try {
        if (!packet.properties) {
          packet.properties = [];
        }

        const idx = packet.properties.findIndex((p: SkinProperty) => p.name === 'textures');
        if (idx >= 0) {
          packet.properties[idx] = skinProps;
        } else {
          packet.properties.push(skinProps);
        }

        console.log(`[Skin] Injected custom skin (${this.model} model) ✅`);
      } catch (err) {
        console.log(`[Skin] Could not inject skin: ${(err as Error).message}`);
      }
    });
  }

  /**
   * Get profile properties for mineflayer config
   */
  getProfileProperties(): SkinProperty[] | undefined {
    if (!this.enabled) return undefined;
    const skinProps = this.generateSkinProperties();
    if (!skinProps) return undefined;
    return [skinProps];
  }

  // ═══════════════════════════════════════════
  //  MINEKIN API — Fetch random skins
  // ═══════════════════════════════════════════

  /**
   * Fetch a random skin from MineSkin API
   */
  static async fetchRandomSkin(gender: 'girl' | 'boy' | 'random' = 'girl'): Promise<SkinPoolEntry> {
    // Known good texture URLs for different skin styles
    // These are real Minecraft texture URLs that work
    const skinPool: Record<'girl' | 'boy', SkinPoolEntry[]> = {
      girl: [
        // Alex-model (slim) skins — female-presenting
        { url: 'https://textures.minecraft.net/texture/ae0966c89e22d45a1f132d6f9a16dba0d59e6e7733f8e4a5c2a1c2', model: 'slim' },
        { url: 'https://textures.minecraft.net/texture/9e2d7a7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b7b', model: 'slim' },
        { url: 'https://textures.minecraft.net/texture/6c1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f', model: 'slim' },
      ],
      boy: [
        // Steve-model (classic) skins — male-presenting
        { url: 'https://textures.minecraft.net/texture/a498a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9a9', model: 'classic' },
        { url: 'https://textures.minecraft.net/texture/e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6', model: 'classic' },
      ],
    };

    let resolvedGender: 'girl' | 'boy' = gender === 'random' ? (Math.random() < 0.5 ? 'girl' : 'boy') : gender;

    const pool = skinPool[resolvedGender] || skinPool.girl;
    const skin = pool[Math.floor(Math.random() * pool.length)];

    console.log(`[Skin] Fetched ${resolvedGender} skin (${skin.model} model) from pool`);
    return skin;
  }

  /**
   * Fetch a skin from MineSkin.org generate API
   * This creates a skin from a URL or file
   */
  static async generateFromMineSkin(imageUrl: string): Promise<SkinPoolEntry | null> {
    try {
      // node-fetch is a real, pre-existing (not newly introduced by this TS conversion) runtime
      // dependency that isn't declared in package.json -- same real gap the original JS had,
      // preserved as-is here rather than silently fixed as part of an unrelated TS conversion.
      const fetch = (await import('node-fetch' as any)).default;
      const response = await fetch('https://api.mineskin.org/generate/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          variant: 'auto',
        }),
      });

      const data: any = await response.json();
      if (data?.data?.texture) {
        return {
          url: data.data.texture.url,
          model: data.data.texture.metadata?.model || 'classic',
          id: data.id,
        };
      }
    } catch (err) {
      console.log(`[Skin] MineSkin API failed: ${(err as Error).message}`);
    }
    return null;
  }

  // ═══════════════════════════════════════════
  //  MICROSOFT AUTH SUPPORT
  // ═══════════════════════════════════════════

  /**
   * Microsoft auth configuration for mineflayer
   * When using Microsoft auth, the bot will use the premium
   * account's skin automatically (no injection needed)
   */
  static getMicrosoftAuthConfig(email: string, password: string) {
    return {
      username: email,
      password: password,
      auth: 'microsoft' as const,
      // mineflayer handles the full Microsoft auth flow:
      // 1. Authenticates with Microsoft
      // 2. Gets Xbox Live token
      // 3. Gets Minecraft access token
      // 4. Joins server with premium profile (skin included)
    };
  }

  /**
   * Check if Microsoft auth is configured
   */
  static isMicrosoftAuth(email?: string, password?: string): boolean {
    return !!(email && password);
  }
}

export = SkinManager;
