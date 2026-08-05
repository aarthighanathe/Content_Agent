CREATE TYPE "public"."publish_status" AS ENUM('pending', 'posted', 'failed');--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD COLUMN "publish_platform" text;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD COLUMN "publish_status" "publish_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD COLUMN "post_url" text;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD COLUMN "publish_error" text;