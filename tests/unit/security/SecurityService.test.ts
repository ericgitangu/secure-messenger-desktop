import crypto from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityService } from '@main/security/SecurityService';

describe('SecurityService (AES-256-GCM)', () => {
  let service: SecurityService;

  beforeEach(() => {
    // Use explicit test key for deterministic tests
    const testKey = crypto.randomBytes(32);
    service = SecurityService.createWithKey(testKey);
  });

  it('should be a singleton when using getInstance', () => {
    SecurityService.resetInstance();
    const instance1 = SecurityService.getInstance();
    const instance2 = SecurityService.getInstance();
    expect(instance1).toBe(instance2);
    SecurityService.resetInstance();
  });

  it('should encrypt and decrypt round-trip correctly', () => {
    const plaintext = 'Hello, secure world!';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different output from input (not plaintext)', () => {
    const plaintext = 'sensitive message content';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).not.toContain(plaintext);
  });

  it('should produce different ciphertext for same plaintext (random IV)', () => {
    const plaintext = 'same input, different output';
    const encrypted1 = service.encrypt(plaintext);
    const encrypted2 = service.encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2); // random IV ensures uniqueness
  });

  it('should handle empty strings', () => {
    const encrypted = service.encrypt('');
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('should handle unicode characters', () => {
    const plaintext = 'Hallo Welt! Unicod\u00e9 \u30c6\u30b9\u30c8 \ud83d\udd12';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle very long strings', () => {
    const plaintext = 'x'.repeat(10000);
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt batch correctly', () => {
    const plaintexts = ['message 1', 'message 2', 'message 3'];
    const encrypted = service.encryptBatch(plaintexts);
    expect(encrypted).toHaveLength(3);
    encrypted.forEach((e, i) => {
      expect(e).not.toBe(plaintexts[i]);
    });
  });

  it('should decrypt batch correctly', () => {
    const plaintexts = ['message 1', 'message 2', 'message 3'];
    const encrypted = service.encryptBatch(plaintexts);
    const decrypted = service.decryptBatch(encrypted);
    expect(decrypted).toEqual(plaintexts);
  });

  it('should handle special characters', () => {
    const plaintext = '<script>alert("xss")</script> & "quotes" \'single\' \n\t\r';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should detect tampered ciphertext (authentication)', () => {
    const encrypted = service.encrypt('authentic message');
    // Tamper with the ciphertext
    const tampered = encrypted.slice(0, -4) + 'XXXX';
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('should reject invalid ciphertext format', () => {
    expect(() => service.decrypt('not-valid-ciphertext')).toThrow();
  });

  it('should fail decryption with wrong key', () => {
    const encrypted = service.encrypt('secret');
    const wrongKey = crypto.randomBytes(32);
    const wrongService = SecurityService.createWithKey(wrongKey);
    expect(() => wrongService.decrypt(encrypted)).toThrow();
  });

  it('should verify valid ciphertext', () => {
    const encrypted = service.encrypt('test verify');
    expect(service.verify(encrypted)).toBe(true);
  });

  it('should reject invalid ciphertext in verify', () => {
    expect(service.verify('garbage')).toBe(false);
  });

  it('should report the correct algorithm', () => {
    expect(service.getAlgorithm()).toBe('aes-256-gcm');
  });
});
