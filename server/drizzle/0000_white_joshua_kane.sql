CREATE TYPE "public"."job_status" AS ENUM('pending', 'researching', 'writing', 'formatting', 'critiquing', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."output_type" AS ENUM('research', 'draft', 'critique', 'final');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('instagram_carousel', 'linkedin_post', 'twitter_thread', 'instagram_caption', 'video_script');--> statement-breakpoint
CREATE TYPE "public"."tone" AS ENUM('professional', 'casual', 'witty', 'educational', 'inspirational');--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"action" text NOT NULL,
	"input_summary" text,
	"output_summary" text,
	"tokens_used" integer DEFAULT 0,
	"duration_ms" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"platform" "platform" NOT NULL,
	"tone" "tone" NOT NULL,
	"target_audience" text NOT NULL,
	"tag" text,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"deleted" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"output_type" "output_type" NOT NULL,
	"content" jsonb NOT NULL,
	"quality_score" integer,
	"partial" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_text" text NOT NULL,
	"embedding" text,
	"platform" "platform" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" integer,
	"display_name" text,
	"platform_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"topic" text DEFAULT '',
	"hook_style" text DEFAULT '',
	"structure" text DEFAULT '',
	"cta_pattern" text DEFAULT '',
	"content_sample" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_onboarding" (
	"user_id" text PRIMARY KEY NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"brand_name" text DEFAULT '',
	"preferred_tone" text DEFAULT 'professional',
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"brand_name" text DEFAULT '',
	"brand_voice" text DEFAULT 'professional',
	"phrases_use" text DEFAULT '',
	"phrases_avoid" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_job_id_content_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."content_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_jobs" ADD CONSTRAINT "content_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_outputs" ADD CONSTRAINT "content_outputs_job_id_content_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."content_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_embeddings" ADD CONSTRAINT "post_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_logs_job_id" ON "agent_logs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_content_jobs_user_active" ON "content_jobs" USING btree ("user_id","deleted","created_at");--> statement-breakpoint
CREATE INDEX "idx_content_outputs_job_id" ON "content_outputs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_content_outputs_job_type" ON "content_outputs" USING btree ("job_id","output_type");--> statement-breakpoint
CREATE INDEX "idx_social_tokens_user_platform" ON "social_tokens" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "idx_templates_user_id" ON "templates" USING btree ("user_id");