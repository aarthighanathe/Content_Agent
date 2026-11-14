-- WHY: unique (user_id, feed_url) would fail on existing duplicates; keep the oldest row.
DELETE FROM "feed_monitors" a USING "feed_monitors" b
  WHERE a."user_id" = b."user_id" AND a."feed_url" = b."feed_url"
  AND (a."created_at", a."id") > (b."created_at", b."id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_feed_monitors_user_feed_unique" ON "feed_monitors" USING btree ("user_id","feed_url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_jobs_status_updated" ON "content_jobs" USING btree ("status","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduled_posts_publish_sweep" ON "scheduled_posts" USING btree ("publish_status","published_at");
