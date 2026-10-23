import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

// WHY before any test import: schemas/index.ts imports config.ts, and config.ts
// validates process.env at module load. GitHub Actions has no .env, so the
// first route/schema import throws and the suite never reaches assertions.
// Local runs still prefer a real .env; these placeholders only fill gaps.
loadDotenv({ path: resolve(process.cwd(), '.env') });
loadDotenv({ path: resolve(process.cwd(), '../.env') });

const placeholders: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/pensieve_test',
  CLERK_SECRET_KEY: 'test_secret',
  CLERK_PUBLISHABLE_KEY: 'test_publishable',
  GEMINI_API_KEY: 'test_gemini_key',
  TOKEN_ENCRYPTION_KEY: '0'.repeat(64),
  OAUTH_STATE_SECRET: 'test-oauth-secret-that-is-long-enough-32',
  APP_URL: 'http://127.0.0.1:3001',
  FRONTEND_URL: 'http://127.0.0.1:5173',
};

for (const [key, value] of Object.entries(placeholders)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
