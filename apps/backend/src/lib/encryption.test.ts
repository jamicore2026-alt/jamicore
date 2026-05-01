import { describe, it, expect } from 'vitest';
import { encryptConfig, decryptConfig } from './encryption.js';

describe('encryption', () => {
  it('encrypts and decrypts a config', () => {
    const config = { secret_key: 'sk_test_123', webhook_secret: 'whsec_456' };
    const encrypted = encryptConfig(config);
    const decrypted = decryptConfig(encrypted);
    expect(decrypted).toEqual(config);
  });

  it('throws on unrecognized format', () => {
    expect(() => decryptConfig('not-a-valid-format')).toThrow('Unrecognized encrypted config format');
  });
});
