ALTER TABLE "order_items" ADD COLUMN "product_image_urls_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "public_token_expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "orders" SET "public_token_expires_at" = COALESCE("sent_at", "created_at", now()) + interval '14 days';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "public_token_expires_at" SET NOT NULL;
