DROP INDEX "idx_social_tokens_user_platform";--> statement-breakpoint
CREATE INDEX "idx_content_outputs_type_job" ON "content_outputs" USING btree ("output_type","job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_social_tokens_user_platform" ON "social_tokens" USING btree ("user_id","platform");