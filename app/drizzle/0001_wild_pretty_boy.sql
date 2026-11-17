ALTER TABLE "share_links" ADD COLUMN "write_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "share_links" ADD COLUMN "write_window_start" timestamp with time zone;