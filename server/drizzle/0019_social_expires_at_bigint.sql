-- WHY: OAuth stores Date.now()+expires_in*1000 (~1.7e12); integer max is ~2.1e9
ALTER TABLE "social_tokens" ALTER COLUMN "expires_at" SET DATA TYPE bigint;
