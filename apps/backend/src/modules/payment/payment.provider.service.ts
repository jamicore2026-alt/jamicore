// Payment provider configuration — getProviders, configureProvider, masking helpers.
import { paymentProviders } from '../../db/schema.js';
import { encryptConfig, decryptConfig } from '../../lib/encryption.js';
import { ErrorCodes } from '../../errors/codes.js';
import * as repo from './payment.repo.js';

/** Mask a secret string, showing only the last 4 characters. */
function maskSecret(value: string | undefined): string {
  if (!value || value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

/** Mask all values in a config record (API keys etc.). */
function maskConfig(config: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!config) return null;
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    masked[key] = maskSecret(value);
  }
  return masked;
}

/** Decrypt and mask a provider row for public API responses. */
function decryptAndMaskProvider(provider: typeof paymentProviders.$inferSelect) {
  return {
    ...provider,
    config: maskConfig(decryptConfig(provider.config)),
  };
}

export const providerService = {
  async getProviders(storeId: string) {
    const providers = await repo.findProvidersByStoreId(storeId);
    // Decrypt and mask API keys in responses
    return providers.map((p) => decryptAndMaskProvider(p));
  },

  async configureProvider(
    storeId: string,
    provider: string,
    isEnabled: boolean,
    config?: Record<string, string>,
  ) {
    // COD needs no API keys
    if (provider === 'cod') {
      const result = await repo.upsertProvider(storeId, provider, { isEnabled, config: undefined });
      return { ...result, config: null };
    }

    // Stripe/Razorpay: validate required config keys are present when enabling
    if (isEnabled) {
      if (provider === 'stripe' && (!config?.secret_key || !config?.webhook_secret)) {
        throw Object.assign(new Error('Stripe requires secret_key and webhook_secret in config'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }
      if (provider === 'razorpay' && (!config?.key_id || !config?.key_secret || !config?.webhook_secret)) {
        throw Object.assign(new Error('Razorpay requires key_id, key_secret, and webhook_secret in config'), {
          code: ErrorCodes.VALIDATION_ERROR,
        });
      }
    }

    let encryptedConfig: string | undefined;
    if (config && Object.keys(config).length > 0) {
      encryptedConfig = encryptConfig(config);
    }

    const result = await repo.upsertProvider(storeId, provider, {
      isEnabled,
      config: encryptedConfig ? (encryptedConfig as unknown as Record<string, string>) : config,
    });

    return { ...result, config: maskConfig(decryptConfig(result.config)) };
  },
};
