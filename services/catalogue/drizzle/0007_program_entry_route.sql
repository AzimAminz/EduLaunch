CREATE TABLE "catalogue"."program_entry_route" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"entry_route" text NOT NULL,
	"source_category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_entry_route_unique" UNIQUE("program_id","entry_route","source_category")
);
--> statement-breakpoint
ALTER TABLE "catalogue"."program_entry_route" ADD CONSTRAINT "program_entry_route_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "catalogue"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_entry_route_route_idx" ON "catalogue"."program_entry_route" USING btree ("entry_route");