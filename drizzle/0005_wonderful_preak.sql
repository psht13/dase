ALTER TYPE "public"."payment_provider" ADD VALUE 'MANUAL_CARD_TRANSFER' BEFORE 'CASH_ON_DELIVERY';--> statement-breakpoint
CREATE TABLE "payment_requisites" (
	"bank_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_value" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"label" text NOT NULL,
	"note" text,
	"owner_id" uuid NOT NULL,
	"recipient_name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_requisites_label_length" CHECK (char_length("payment_requisites"."label") <= 80),
	CONSTRAINT "payment_requisites_recipient_name_length" CHECK ("payment_requisites"."recipient_name" IS NULL OR char_length("payment_requisites"."recipient_name") <= 120),
	CONSTRAINT "payment_requisites_bank_name_length" CHECK ("payment_requisites"."bank_name" IS NULL OR char_length("payment_requisites"."bank_name") <= 80),
	CONSTRAINT "payment_requisites_display_value_length" CHECK (char_length("payment_requisites"."display_value") <= 120),
	CONSTRAINT "payment_requisites_note_length" CHECK ("payment_requisites"."note" IS NULL OR char_length("payment_requisites"."note") <= 240),
	CONSTRAINT "payment_requisites_sort_order_nonnegative" CHECK ("payment_requisites"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payment_requisites" ADD CONSTRAINT "payment_requisites_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_requisites_owner_id_idx" ON "payment_requisites" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "payment_requisites_owner_active_idx" ON "payment_requisites" USING btree ("owner_id","is_active");