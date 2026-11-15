ALTER TABLE "content_jobs" ADD COLUMN IF NOT EXISTS "source_material" text;
--> statement-breakpoint
ALTER TABLE "content_jobs" ADD COLUMN IF NOT EXISTS "competitor_context" text;
