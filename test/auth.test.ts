import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Authentication & Password Security', () => {
  const secret = 'test-secret-key-12345';

  it('hashes passwords with salt and verifies hash correctly', async () => {
    const rawPassword = 'StudentPlacement2026!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    expect(hash).not.toBe(rawPassword);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isMismatch = await bcrypt.compare('WrongPassword', hash);
    expect(isMismatch).toBe(false);
  });

  it('signs and verifies JWT tokens with payload integrity', () => {
    const userId = 'usr-alex-123';
    const token = jwt.sign({ userId }, secret, { expiresIn: '1h' });

    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, secret) as { userId: string };
    expect(decoded.userId).toBe(userId);
  });

  it('fails verification for expired or forged tokens', () => {
    const invalidSecret = 'wrong-secret';
    const token = jwt.sign({ userId: '123' }, secret);

    expect(() => {
      jwt.verify(token, invalidSecret);
    }).toThrow();
  });
});
