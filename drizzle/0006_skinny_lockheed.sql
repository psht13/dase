CREATE TYPE "public"."nova_post_api_environment" AS ENUM('stage', 'production_global', 'production_ukraine', 'custom');--> statement-breakpoint
CREATE TYPE "public"."nova_post_payer_type" AS ENUM('Recipient', 'Sender', 'ThirdPerson');--> statement-breakpoint
CREATE TYPE "public"."owner_shipping_carrier" AS ENUM('NOVA_POST');--> statement-breakpoint
CREATE TABLE "owner_shipping_settings" (
	"api_base_url" text NOT NULL,
	"api_environment" "nova_post_api_environment" NOT NULL,
	"api_key_encrypted" text,
	"api_key_preview" text,
	"auth_url" text,
	"carrier" "owner_shipping_carrier" DEFAULT 'NOVA_POST' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"default_actual_weight_grams" integer NOT NULL,
	"default_height_mm" integer NOT NULL,
	"default_length_mm" integer NOT NULL,
	"default_volumetric_weight_grams" integer NOT NULL,
	"default_width_mm" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"owner_id" uuid NOT NULL,
	"payer_contract_number" text,
	"payer_type" "nova_post_payer_type" NOT NULL,
	"sender_company_name" text,
	"sender_company_tin" text,
	"sender_country_code" text NOT NULL,
	"sender_division_id" text NOT NULL,
	"sender_email" text,
	"sender_name" text NOT NULL,
	"sender_phone" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owner_shipping_settings_api_base_url_length" CHECK (char_length("owner_shipping_settings"."api_base_url") <= 500),
	CONSTRAINT "owner_shipping_settings_auth_url_length" CHECK ("owner_shipping_settings"."auth_url" IS NULL OR char_length("owner_shipping_settings"."auth_url") <= 500),
	CONSTRAINT "owner_shipping_settings_api_key_preview_length" CHECK ("owner_shipping_settings"."api_key_preview" IS NULL OR char_length("owner_shipping_settings"."api_key_preview") <= 32),
	CONSTRAINT "owner_shipping_settings_sender_country_code_length" CHECK (char_length("owner_shipping_settings"."sender_country_code") = 2),
	CONSTRAINT "owner_shipping_settings_sender_division_id_length" CHECK (char_length("owner_shipping_settings"."sender_division_id") <= 80),
	CONSTRAINT "owner_shipping_settings_sender_name_length" CHECK (char_length("owner_shipping_settings"."sender_name") <= 160),
	CONSTRAINT "owner_shipping_settings_sender_phone_length" CHECK (char_length("owner_shipping_settings"."sender_phone") <= 32),
	CONSTRAINT "owner_shipping_settings_sender_email_length" CHECK ("owner_shipping_settings"."sender_email" IS NULL OR char_length("owner_shipping_settings"."sender_email") <= 160),
	CONSTRAINT "owner_shipping_settings_sender_company_tin_length" CHECK ("owner_shipping_settings"."sender_company_tin" IS NULL OR char_length("owner_shipping_settings"."sender_company_tin") <= 64),
	CONSTRAINT "owner_shipping_settings_sender_company_name_length" CHECK ("owner_shipping_settings"."sender_company_name" IS NULL OR char_length("owner_shipping_settings"."sender_company_name") <= 160),
	CONSTRAINT "owner_shipping_settings_payer_contract_number_length" CHECK ("owner_shipping_settings"."payer_contract_number" IS NULL OR char_length("owner_shipping_settings"."payer_contract_number") <= 80),
	CONSTRAINT "owner_shipping_settings_width_positive" CHECK ("owner_shipping_settings"."default_width_mm" > 0),
	CONSTRAINT "owner_shipping_settings_length_positive" CHECK ("owner_shipping_settings"."default_length_mm" > 0),
	CONSTRAINT "owner_shipping_settings_height_positive" CHECK ("owner_shipping_settings"."default_height_mm" > 0),
	CONSTRAINT "owner_shipping_settings_actual_weight_positive" CHECK ("owner_shipping_settings"."default_actual_weight_grams" > 0),
	CONSTRAINT "owner_shipping_settings_volumetric_weight_positive" CHECK ("owner_shipping_settings"."default_volumetric_weight_grams" > 0),
	CONSTRAINT "owner_shipping_settings_third_person_contract" CHECK ("owner_shipping_settings"."payer_type" <> 'ThirdPerson' OR "owner_shipping_settings"."payer_contract_number" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "owner_shipping_settings" ADD CONSTRAINT "owner_shipping_settings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "owner_shipping_settings_owner_id_unique" ON "owner_shipping_settings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "owner_shipping_settings_owner_carrier_idx" ON "owner_shipping_settings" USING btree ("owner_id","carrier");