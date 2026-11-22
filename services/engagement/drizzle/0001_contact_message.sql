CREATE TYPE "engagement"."contact_category" AS ENUM('usage', 'data', 'privacy', 'other');--> statement-breakpoint
CREATE TABLE "engagement"."contact_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"category" "engagement"."contact_category" NOT NULL,
	"message" text NOT NULL,
	"handled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone
);
