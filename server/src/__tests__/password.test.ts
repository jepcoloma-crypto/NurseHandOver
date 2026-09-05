import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateToken, verifyToken } from '../lib/token.js';

describe('Password Security', () => {
  it('should hash password', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct password', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);

    const result = await comparePassword(password, hash);
    expect(result).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);

    const result = await comparePassword('wrongpassword', hash);
    expect(result).toBe(false);
  });
});

describe('Token Security', () => {
  it('should generate token', () => {
    const payload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      roles: ['NURSE'],
    };

    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('should verify valid token', () => {
    const payload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      roles: ['NURSE'],
    };

    const token = generateToken(payload);
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.roles).toEqual(payload.roles);
  });

  it('should reject invalid token', () => {
    expect(() => {
      verifyToken('invalid-token');
    }).toThrow();
  });
});
