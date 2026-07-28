ALTER TABLE "content_jobs" ADD COLUMN "source_job_id" uuid;--> statement-breakpoint
ALTER TABLE "content_jobs" ADD COLUMN "source_platform" "platform";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "content_dna" jsonb;--> statement-breakpoint
CREATE INDEX "idx_content_jobs_user_platform" ON "content_jobs" USING btree ("user_id","platform","deleted");