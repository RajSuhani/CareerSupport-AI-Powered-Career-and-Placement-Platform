// Secret validation and resolution module
export const DEV_JWT_SECRET_PLACEHOLDER = 'career_support_secure_development_jwt_secret_token_12345';

const KNOWN_DEV_SECRETS = new Set([
  DEV_JWT_SECRET_PLACEHOLDER,
  'development_secret',
  'dev_secret',
  'default_secret',
  'secret',
  '123456',
  'password',
  'jwt_secret',
]);

export interface SecretValidationResult {
  valid: boolean;
  secret: string;
  error?: string;
}

/**
 * Validates and retrieves the JWT secret according to the runtime environment.
 * If running in production (NODE_ENV === 'production'):
 *  - Fails if JWT_SECRET is undefined, empty, or whitespace.
 *  - Fails if JWT_SECRET matches a known development placeholder or insecure default.
 *  - Fails if JWT_SECRET is excessively short (< 32 characters) for production HMAC-SHA256 signing.
 * If running in non-production:
 *  - Falls back to the development secret placeholder if not explicitly provided.
 */
export function resolveJwtSecret(
  ...args: [envSecret?: string, nodeEnv?: string]
): SecretValidationResult {
  const hasEnvSecretArg = args.length >= 1;
  const hasNodeEnvArg = args.length >= 2;
  const currentEnv = hasNodeEnvArg ? args[1] : process.env.NODE_ENV;
  const rawSecret = hasEnvSecretArg ? args[0] : process.env.JWT_SECRET;
  const isProduction = currentEnv === 'production';
  const trimmedSecret = rawSecret?.trim();

  if (isProduction) {
    if (!trimmedSecret) {
      return {
        valid: false,
        secret: '',
        error:
          'CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty in production mode. ' +
          'A strong, random secret key must be set in your production hosting environment (e.g. Cloud Run secrets).',
      };
    }

    if (KNOWN_DEV_SECRETS.has(trimmedSecret)) {
      return {
        valid: false,
        secret: '',
        error:
          'CRITICAL CONFIGURATION ERROR: JWT_SECRET is set to an insecure development placeholder or default value in production. ' +
          'Replace it with a cryptographically secure, randomly generated secret (e.g. openssl rand -base64 32).',
      };
    }

    if (trimmedSecret.length < 32) {
      return {
        valid: false,
        secret: '',
        error:
          'CRITICAL CONFIGURATION ERROR: JWT_SECRET is too short for production security. ' +
          'It must be at least 32 characters long to ensure cryptographic integrity.',
      };
    }

    return { valid: true, secret: trimmedSecret };
  }

  // Development or test mode
  if (trimmedSecret) {
    return { valid: true, secret: trimmedSecret };
  }

  return { valid: true, secret: DEV_JWT_SECRET_PLACEHOLDER };
}

/**
 * Validates the JWT secret at server startup and throws if invalid in production.
 */
export function assertValidServerConfiguration(): string {
  const result = resolveJwtSecret();
  if (!result.valid) {
    console.error(`\n======================================================`);
    console.error(`[SECURITY SHUTDOWN] Application startup aborted!`);
    console.error(result.error);
    console.error(`======================================================\n`);
    throw new Error(result.error);
  }
  return result.secret;
}
