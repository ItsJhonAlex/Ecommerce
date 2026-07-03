CREATE TABLE "store_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"business_name" text DEFAULT 'Avanzar' NOT NULL,
	"phone" text,
	"address" text,
	"email" text,
	"receipt_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receipt_token" uuid DEFAULT gen_random_uuid() NOT NULL;