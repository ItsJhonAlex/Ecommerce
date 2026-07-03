CREATE TYPE "public"."fulfillment_method" AS ENUM('pickup', 'delivery');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "ship_province" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "ship_municipality" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "ship_address_line" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment" "fulfillment_method" DEFAULT 'delivery' NOT NULL;