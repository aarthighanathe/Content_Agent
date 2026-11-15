-- WHY: a unique partial index would fail on jobs that already have several 'final' rows; keep the newest.
DELETE FROM "content_outputs" a USING "content_outputs" b
  WHERE a."job_id" = b."job_id" AND a."output_type" = 'final' AND b."output_type" = 'final'
  AND (a."created_at", a."id") < (b."created_at", b."id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_content_outputs_job_final_unique" ON "content_outputs" USING btree ("job_id") WHERE "content_outputs"."output_type" = 'final';
