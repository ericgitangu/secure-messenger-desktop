import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * SecurityService — AES-256-GCM encryption boundary for all message bodies.
 *
 * Implementation: AES-256-GCM (authenticated encryption with associated data).
 * - 256-bit key generated on first launch, persisted in app data directory
 * - 96-bit random IV per encryption (NIST recommended for GCM)
 * - 128-bit authentication tag for tamper detection
 * - Ciphertext format: base64(iv:authTag:ciphertext)
 *
 * Production upgrade path:
 * - Integrate libsignal-client for Signal Protocol (E2E encryption)
 * - Key exchange via X3DH (Extended Triple Diffie-Hellman)
 * - Double Ratchet algorithm for forward secrecy
 * - Per-message keys derived from ratchet state
 * - Hardware-backed keystore (macOS Keychain, Windows DPAPI)
 *
 * All message bodies MUST pass through encrypt() before SQLite write
 * and decrypt() after SQLite read. No plaintext bodies in logs.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — NIST recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SEPARATOR = ':';

export class SecurityService {
  private static instance: SecurityService;
  private key: Buffer;

  private constructor(key: Buffer) {
    this.key = key;
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      const key = SecurityService.loadOrGenerateKey();
      SecurityService.instance = new SecurityService(key);
    }
    return SecurityService.instance;
  }

  /** Reset singleton (for testing) */
  static resetInstance(): void {
    SecurityService.instance = undefined as unknown as SecurityService;
  }

  /** Create instance with explicit key (for testing) */
  static createWithKey(key: Buffer): SecurityService {
    return new SecurityService(key);
  }

  private static getKeyPath(): string {
    try {
      const { app } = require('electron');
      return path.join(app.getPath('userData'), '.encryption-key');
    } catch {
      // Outside Electron (tests, scripts)
      return path.join(process.cwd(), '.data', '.encryption-key');
    }
  }

  private static loadOrGenerateKey(): Buffer {
    const keyPath = SecurityService.getKeyPath();
    const keyDir = path.dirname(keyPath);

    try {
      if (fs.existsSync(keyPath)) {
        const keyHex = fs.readFileSync(keyPath, 'utf-8').trim();
        return Buffer.from(keyHex, 'hex');
      }
    } catch {
      // Key file corrupted or unreadable — regenerate
    }

    // Generate new key
    const key = crypto.randomBytes(KEY_LENGTH);

    // Ensure directory exists
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }

    // Write key with restrictive permissions (owner read/write only)
    fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
    return key;
  }

  /**
   * Encrypt plaintext using AES-256-GCM.
   * Returns base64-encoded string: iv:authTag:ciphertext
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Pack as: iv:authTag:ciphertext (all base64)
    const packed = [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(SEPARATOR);

    return Buffer.from(packed).toString('base64');
  }

  /**
   * Decrypt AES-256-GCM ciphertext.
   * Input: base64-encoded string containing iv:authTag:ciphertext
   */
  decrypt(ciphertext: string): string {
    const packed = Buffer.from(ciphertext, 'base64').toString('utf-8');
    const parts = packed.split(SEPARATOR);

    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format: expected iv:authTag:ciphertext');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf-8');
  }

  encryptBatch(plaintexts: string[]): string[] {
    return plaintexts.map((p) => this.encrypt(p));
  }

  decryptBatch(ciphertexts: string[]): string[] {
    return ciphertexts.map((c) => this.decrypt(c));
  }

  /** Verify that a ciphertext can be decrypted (integrity check) */
  verify(ciphertext: string): boolean {
    try {
      this.decrypt(ciphertext);
      return true;
    } catch {
      return false;
    }
  }

  /** Get the algorithm used (for logging/metrics, never expose the key) */
  getAlgorithm(): string {
    return ALGORITHM;
  }
}
