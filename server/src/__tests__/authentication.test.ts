import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from '../lib/token.js';
import { hashPassword, comparePassword } from '../lib/password.js';

describe('Authentication Security', () => {
  describe('Password Hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'securePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'securePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify password correctly', async () => {
      const password = 'securePassword123!';
      const hash = await hashPassword(password);

      const validResult = await comparePassword(password, hash);
      const invalidResult = await comparePassword('wrongPassword', hash);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate JWT token', () => {
      const payload = {
        userId: 'user-123',
        email: 'nurse@hospital.com',
        roles: ['NURSE'],
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user data in token', () => {
      const payload = {
        userId: 'user-123',
        email: 'nurse@hospital.com',
        roles: ['NURSE', 'SUPERVISOR'],
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.roles).toEqual(payload.roles);
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', () => {
      const payload = {
        userId: 'user-123',
        email: 'nurse@hospital.com',
        roles: ['NURSE'],
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
    });

    it('should reject invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow();
    });

    it('should reject empty token', () => {
      expect(() => {
        verifyToken('');
      }).toThrow();
    });
  });

  describe('Token Payload Security', () => {
    it('should not expose sensitive data in token', () => {
      const payload = {
        userId: 'user-123',
        email: 'nurse@hospital.com',
        roles: ['NURSE'],
      };

      const token = generateToken(payload);
      const parts = token.split('.');

      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payloadDecoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      expect(header.alg).toBeDefined();
      expect(payloadDecoded.userId).toBe(payload.userId);
      expect(payloadDecoded.password).toBeUndefined();
    });
  });
});
