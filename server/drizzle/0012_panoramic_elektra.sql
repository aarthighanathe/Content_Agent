CREATE TABLE "feed_monitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"feed_url" text NOT NULL,
	"platform" "platform" NOT NULL,
	"tone" "tone" NOT NULL,
	"target_audience" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_item_guid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_feed_monitors_user_active" ON "feed_monitors" USING btree ("user_id","active");