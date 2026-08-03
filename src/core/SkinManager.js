/**
 * Skin Manager — Custom skin support for Mishri
 * Injects skin textures into the login packet so the server
 * displays a custom skin instead of the default Steve/Alex
 */

const crypto = require('crypto');

class SkinManager {
  constructor(config = {}) {
    this.config = config;
    this.skinUrl = config.url || '';
    this.model = config.model || 'classic'; // 'classic' or 'slim'
    this.enabled = config.enabled !== false;
  }

  /**
   * Generate signed property data for skin
   * For offline-mode servers, we inject skin data directly
   * into the profile properties of the login packet
   */
  generateSkinProperties() {
    if (!this.enabled || !this.skinUrl) return null;

    const textures = {
      timestamp: Date.now(),
      profileId: crypto.randomUUID().replace(/-/g, ''),
      profileName: 'Mishri',
      textures: {
        SKIN: {
          url: this.skinUrl,
          ...(this.model === 'slim' ? { metadata: { model: 'slim' } } : {})
        }
      }
    };

    const texturesBase64 = Buffer.from(JSON.stringify(textures)).toString('base64');

    // For offline auth, the signature can be empty
    // The server will still display the skin from the URL
    return {
      name: 'textures',
      value: texturesBase64,
      signature: '' // Offline mode doesn't verify signatures
    };
  }

  /**
   * Hook into the bot's connection to inject skin data
   * This patches the 'properties' field of the login packet
   */
  injectSkin(bot) {
    if (!this.enabled) {
      console.log('[Skin] Custom skin disabled');
      return;
    }

    const skinProps = this.generateSkinProperties();
    if (!skinProps) {
      console.log('[Skin] No skin URL configured, using default');
      return;
    }

    // Intercept the client connection to add skin properties
    bot._client.once('login', (packet) => {
      try {
        if (packet.properties) {
          // Append our skin property to existing ones
          const existing = JSON.parse(
            Buffer.from(
              packet.properties.find(p => p.name === 'textures')?.value || 'e30',
              'base64'
            ).toString()
          );
          console.log('[Skin] Server already has texture data, overlaying ours');
        }

        // Inject skin property
        if (!packet.properties) {
          packet.properties = [];
        }

        // Replace existing textures or add new
        const idx = packet.properties.findIndex(p => p.name === 'textures');
        if (idx >= 0) {
          packet.properties[idx] = skinProps;
        } else {
          packet.properties.push(skinProps);
        }

        console.log(`[Skin] Injected custom skin (${this.model} model)`);
      } catch (err) {
        console.log(`[Skin] Could not inject skin: ${err.message}`);
      }
    });

    // Alternative: use the profile property setting in mineflayer options
    // This works for most offline servers
    bot._client.on('session', (data) => {
      console.log('[Skin] Session established, skin should be visible');
    });
  }

  /**
   * Create a mineflayer-compatible profile with skin
   * Use this in the bot config's 'profile' field
   */
  getProfileProperties() {
    if (!this.enabled) return undefined;

    const skinProps = this.generateSkinProperties();
    if (!skinProps) return undefined;

    return [skinProps];
  }

  /**
   * Upload a skin to Mojang API (requires premium account)
   * Not typically needed for offline servers
   */
  async uploadSkin(accessToken, skinData) {
    // This would require a premium Minecraft account
    // For offline servers, just set the URL in config
    console.log('[Skin] Skin upload requires a premium account — use URL for offline servers');
  }
}

module.exports = SkinManager;
