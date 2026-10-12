import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveJwtSecret, DEV_JWT_SECRET_PLACEHOLDER } from '../server/config/secrets.ts';

describe('Server Startup & JWT Secret Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails production startup when JWT_SECRET is completely missing', () => {
    const result = resolveJwtSecret(undefined, 'production');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JWT_SECRET environment variable is missing or empty in production mode');
  });

  it('fails production startup when JWT_SECRET is an empty string or whitespace', () => {
    const result = resolveJwtSecret('   ', 'production');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JWT_SECRET environment variable is missing or empty in production mode');
  });

  it('fails production startup when JWT_SECRET is a known development placeholder', () => {
    const result = resolveJwtSecret(DEV_JWT_SECRET_PLACEHOLDER, 'production');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JWT_SECRET is set to an insecure development placeholder');
  });

  it('fails production startup when JWT_SECRET is a trivial weak secret', () => {
    const result = resolveJwtSecret('secret', 'production');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('insecure development placeholder');
  });

  it('fails production startup when JWT_SECRET is too short (< 32 chars)', () => {
    const result = resolveJwtSecret('short-secret-under-32-chars!', 'production');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JWT_SECRET is too short for production security');
  });

  it('succeeds in production mode with a strong configured secret (>= 32 chars)', () => {
    const strongSecret = 'c7a4e8d3b2f10987654321fedcba0987654321fedcba0987654321fedcba098';
    const result = resolveJwtSecret(strongSecret, 'production');
    expect(result.valid).toBe(true);
    expect(result.secret).toBe(strongSecret);
    expect(result.error).toBeUndefined();
  });

  it('succeeds in development mode using configured secret if provided', () => {
    const customDevSecret = 'my-custom-dev-secret';
    const result = resolveJwtSecret(customDevSecret, 'development');
    expect(result.valid).toBe(true);
    expect(result.secret).toBe(customDevSecret);
  });

  it('falls back safely to DEV_JWT_SECRET_PLACEHOLDER in development mode when secret is omitted', () => {
    const result = resolveJwtSecret(undefined, 'development');
    expect(result.valid).toBe(true);
    expect(result.secret).toBe(DEV_JWT_SECRET_PLACEHOLDER);
  });
});
