// AES-256-GCM encryption utilities for sensitive payment provider configs
// Format: base64(iv):base64(authTag):base64(ciphertext)

import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended IV length for GCM

function getKey(): Buffer {
  const keyHex = env.PAYMENT_CONFIG_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('PAYMENT_CONFIG_ENCRYPTION_KEY is not configured');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('PAYMENT_CONFIG_ENCRYPTION_KEY must be a 32-byte (64 hex character) string');
  }
  return key;
}

/**
 * Encrypt a payment provider config object.
 * Returns a compact base64 string safe for JSON/text columns.
 */
export function encryptConfig(config: Record<string, string>): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(config);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypt a payment provider config string back into a config object.
 * Supports legacy plaintext objects by returning them as-is.
 */
export function decryptConfig(encryptedString: string | Record<string, string> | null | undefined): Record<string, string> | null {
  if (!encryptedString) return null;
  // Legacy plaintext fallback removed — all configs must be encrypted
  if (typeof encryptedString !== 'string') {
    throw new Error('Legacy plaintext payment config detected. Run migration to encrypt all provider configs before proceeding.');
  }
  const key = getKey();
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Unrecognized encrypted config format: expected iv:authTag:ciphertext');
  }
  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as Record<string, string>;
}
