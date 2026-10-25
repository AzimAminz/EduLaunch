CREATE SCHEMA IF NOT EXISTS "engagement";
--> statement-breakpoint
CREATE TYPE "engagement"."ticket_category" AS ENUM('wrong_data', 'account', 'other');--> statement-breakpoint
CREATE TYPE "engagement"."ticket_status" AS ENUM('open', 'in_progress', 'closed');--> statement-breakpoint
CREATE TABLE "engagement"."notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid,
	"notification_type" text NOT NULL,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement"."support_ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_admin_id" uuid,
	"program_id" uuid,
	"category" "engagement"."ticket_category" NOT NULL,
	"message" text NOT NULL,
	"admin_reply" text,
	"ticket_status" "engagement"."ticket_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
