import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["owner", "user"]);
export const orderStatus = pgEnum("order_status", [
  "DRAFT",
  "SENT_TO_CUSTOMER",
  "CONFIRMED_BY_CUSTOMER",
  "PAYMENT_PENDING",
  "PAID",
  "PAYMENT_FAILED",
  "SHIPMENT_PENDING",
  "SHIPMENT_CREATED",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "RETURN_REQUESTED",
  "RETURNED",
  "CANCELLED",
]);
export const paymentProvider = pgEnum("payment_provider", [
  "MANUAL_CARD_TRANSFER",
  "CASH_ON_DELIVERY",
]);
export const paymentStatus = pgEnum("payment_status", [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
]);
export const shipmentCarrier = pgEnum("shipment_carrier", [
  "NOVA_POSHTA",
  "UKRPOSHTA",
]);
export const shipmentStatus = pgEnum("shipment_status", [
  "PENDING",
  "CREATED",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED",
  "FAILED",
  "CANCELLED",
]);
export const auditActorType = pgEnum("audit_actor_type", [
  "OWNER",
  "CUSTOMER",
  "SYSTEM",
]);
export const webhookProvider = pgEnum("webhook_provider", [
  "NOVA_POSHTA",
  "UKRPOSHTA",
]);
export const ownerShippingCarrier = pgEnum("owner_shipping_carrier", [
  "NOVA_POST",
]);
export const novaPostApiEnvironment = pgEnum("nova_post_api_environment", [
  "stage",
  "production_global",
  "production_ukraine",
  "custom",
]);
export const novaPostPayerType = pgEnum("nova_post_payer_type", [
  "Recipient",
  "Sender",
  "ThirdPerson",
]);

export const users = pgTable("users", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  image: text("image"),
  name: text("name"),
  role: userRole("role").default("user").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    ipAddress: text("ip_address"),
    token: text("token").notNull().unique(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    idToken: text("id_token"),
    password: text("password"),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    value: text("value").notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const products = pgTable(
  "products",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    currency: text("currency").default("UAH").notNull(),
    description: text("description"),
    id: uuid("id").defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    name: text("name").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    priceCents: integer("price_cents").notNull(),
    sku: text("sku").notNull().unique(),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("products_price_cents_nonnegative", sql`${table.priceCents} >= 0`),
    check(
      "products_stock_quantity_nonnegative",
      sql`${table.stockQuantity} >= 0`,
    ),
    index("products_owner_id_idx").on(table.ownerId),
  ],
);

export const productImages = pgTable("product_images", {
  altText: text("alt_text"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").default(0).notNull(),
  url: text("url").notNull(),
});

export const customers = pgTable("customers", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  email: text("email"),
  fullName: text("full_name").notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  instagramUsername: text("instagram_username"),
  phone: text("phone").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orders = pgTable(
  "orders",
  {
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    currency: text("currency").default("UAH").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publicToken: text("public_token").notNull().unique(),
    publicTokenExpiresAt: timestamp("public_token_expires_at", {
      withTimezone: true,
    }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: orderStatus("status").default("DRAFT").notNull(),
    totalMinor: integer("total_minor").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("orders_total_minor_nonnegative", sql`${table.totalMinor} >= 0`),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_owner_id_idx").on(table.ownerId),
    index("orders_status_idx").on(table.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lineTotalMinor: integer("line_total_minor").notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    productImageUrlsSnapshot: jsonb("product_image_urls_snapshot")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    productSkuSnapshot: text("product_sku_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: integer("unit_price_minor").notNull(),
  },
  (table) => [
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "order_items_unit_price_minor_nonnegative",
      sql`${table.unitPriceMinor} >= 0`,
    ),
    check(
      "order_items_line_total_minor_nonnegative",
      sql`${table.lineTotalMinor} >= 0`,
    ),
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    amountMinor: integer("amount_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    currency: text("currency").default("UAH").notNull(),
    failureReason: text("failure_reason"),
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    provider: paymentProvider("provider").notNull(),
    providerInvoiceId: text("provider_invoice_id"),
    providerModifiedAt: timestamp("provider_modified_at", {
      withTimezone: true,
    }),
    status: paymentStatus("status").default("PENDING").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("payments_amount_minor_nonnegative", sql`${table.amountMinor} >= 0`),
    index("payments_order_id_idx").on(table.orderId),
    index("payments_provider_invoice_id_idx").on(table.providerInvoiceId),
  ],
);

export const paymentRequisites = pgTable(
  "payment_requisites",
  {
    bankName: text("bank_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    displayValue: text("display_value").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    label: text("label").notNull(),
    note: text("note"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientName: text("recipient_name"),
    sortOrder: integer("sort_order").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("payment_requisites_label_length", sql`char_length(${table.label}) <= 80`),
    check(
      "payment_requisites_recipient_name_length",
      sql`${table.recipientName} IS NULL OR char_length(${table.recipientName}) <= 120`,
    ),
    check(
      "payment_requisites_bank_name_length",
      sql`${table.bankName} IS NULL OR char_length(${table.bankName}) <= 80`,
    ),
    check(
      "payment_requisites_display_value_length",
      sql`char_length(${table.displayValue}) <= 120`,
    ),
    check(
      "payment_requisites_note_length",
      sql`${table.note} IS NULL OR char_length(${table.note}) <= 240`,
    ),
    check(
      "payment_requisites_sort_order_nonnegative",
      sql`${table.sortOrder} >= 0`,
    ),
    index("payment_requisites_owner_id_idx").on(table.ownerId),
    index("payment_requisites_owner_active_idx").on(table.ownerId, table.isActive),
  ],
);

export const ownerShippingSettings = pgTable(
  "owner_shipping_settings",
  {
    apiBaseUrl: text("api_base_url").notNull(),
    apiEnvironment: novaPostApiEnvironment("api_environment").notNull(),
    apiKeyEncrypted: text("api_key_encrypted"),
    apiKeyPreview: text("api_key_preview"),
    authUrl: text("auth_url"),
    carrier: ownerShippingCarrier("carrier").default("NOVA_POST").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    defaultActualWeightGrams: integer("default_actual_weight_grams").notNull(),
    defaultHeightMm: integer("default_height_mm").notNull(),
    defaultLengthMm: integer("default_length_mm").notNull(),
    defaultVolumetricWeightGrams: integer(
      "default_volumetric_weight_grams",
    ).notNull(),
    defaultWidthMm: integer("default_width_mm").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isEnabled: boolean("is_enabled").default(false).notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payerContractNumber: text("payer_contract_number"),
    payerType: novaPostPayerType("payer_type").notNull(),
    senderCompanyName: text("sender_company_name"),
    senderCompanyTin: text("sender_company_tin"),
    senderCountryCode: text("sender_country_code").notNull(),
    senderDivisionId: text("sender_division_id").notNull(),
    senderEmail: text("sender_email"),
    senderName: text("sender_name").notNull(),
    senderPhone: text("sender_phone").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "owner_shipping_settings_api_base_url_length",
      sql`char_length(${table.apiBaseUrl}) <= 500`,
    ),
    check(
      "owner_shipping_settings_auth_url_length",
      sql`${table.authUrl} IS NULL OR char_length(${table.authUrl}) <= 500`,
    ),
    check(
      "owner_shipping_settings_api_key_preview_length",
      sql`${table.apiKeyPreview} IS NULL OR char_length(${table.apiKeyPreview}) <= 32`,
    ),
    check(
      "owner_shipping_settings_sender_country_code_length",
      sql`char_length(${table.senderCountryCode}) = 2`,
    ),
    check(
      "owner_shipping_settings_sender_division_id_length",
      sql`char_length(${table.senderDivisionId}) <= 80`,
    ),
    check(
      "owner_shipping_settings_sender_name_length",
      sql`char_length(${table.senderName}) <= 160`,
    ),
    check(
      "owner_shipping_settings_sender_phone_length",
      sql`char_length(${table.senderPhone}) <= 32`,
    ),
    check(
      "owner_shipping_settings_sender_email_length",
      sql`${table.senderEmail} IS NULL OR char_length(${table.senderEmail}) <= 160`,
    ),
    check(
      "owner_shipping_settings_sender_company_tin_length",
      sql`${table.senderCompanyTin} IS NULL OR char_length(${table.senderCompanyTin}) <= 64`,
    ),
    check(
      "owner_shipping_settings_sender_company_name_length",
      sql`${table.senderCompanyName} IS NULL OR char_length(${table.senderCompanyName}) <= 160`,
    ),
    check(
      "owner_shipping_settings_payer_contract_number_length",
      sql`${table.payerContractNumber} IS NULL OR char_length(${table.payerContractNumber}) <= 80`,
    ),
    check(
      "owner_shipping_settings_width_positive",
      sql`${table.defaultWidthMm} > 0`,
    ),
    check(
      "owner_shipping_settings_length_positive",
      sql`${table.defaultLengthMm} > 0`,
    ),
    check(
      "owner_shipping_settings_height_positive",
      sql`${table.defaultHeightMm} > 0`,
    ),
    check(
      "owner_shipping_settings_actual_weight_positive",
      sql`${table.defaultActualWeightGrams} > 0`,
    ),
    check(
      "owner_shipping_settings_volumetric_weight_positive",
      sql`${table.defaultVolumetricWeightGrams} > 0`,
    ),
    check(
      "owner_shipping_settings_third_person_contract",
      sql`${table.payerType} <> 'ThirdPerson' OR ${table.payerContractNumber} IS NOT NULL`,
    ),
    uniqueIndex("owner_shipping_settings_owner_id_unique").on(table.ownerId),
    index("owner_shipping_settings_owner_carrier_idx").on(
      table.ownerId,
      table.carrier,
    ),
  ],
);

export const shipments = pgTable(
  "shipments",
  {
    addressText: text("address_text"),
    carrier: shipmentCarrier("carrier").notNull(),
    carrierOfficeId: text("carrier_office_id"),
    carrierPayload: jsonb("carrier_payload").$type<Record<string, unknown>>(),
    carrierShipmentId: text("carrier_shipment_id"),
    cityName: text("city_name"),
    cityRef: text("city_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    id: uuid("id").defaultRandom().primaryKey(),
    labelUrl: text("label_url"),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    recipientCustomerId: uuid("recipient_customer_id").references(
      () => customers.id,
      { onDelete: "set null" },
    ),
    status: shipmentStatus("status").default("PENDING").notNull(),
    trackingNumber: text("tracking_number"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("shipments_order_id_idx").on(table.orderId),
    index("shipments_tracking_number_idx").on(table.trackingNumber),
  ],
);

export const orderTags = pgTable(
  "order_tags",
  {
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("order_tags_owner_id_name_unique").on(
      table.ownerId,
      table.name,
    ),
  ],
);

export const orderTagLinks = pgTable(
  "order_tag_links",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => orderTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({
      columns: [table.orderId, table.tagId],
      name: "order_tag_links_pk",
    }),
    index("order_tag_links_tag_id_idx").on(table.tagId),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    actorCustomerId: uuid("actor_customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    actorType: auditActorType("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    eventType: text("event_type").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "cascade",
    }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    index("audit_events_order_id_idx").on(table.orderId),
    index("audit_events_created_at_idx").on(table.createdAt),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    eventType: text("event_type").notNull(),
    externalEventId: text("external_event_id").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    provider: webhookProvider("provider").notNull(),
    providerModifiedAt: timestamp("provider_modified_at", {
      withTimezone: true,
    }),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("webhook_events_provider_external_event_id_unique").on(
      table.provider,
      table.externalEventId,
    ),
    index("webhook_events_received_at_idx").on(table.receivedAt),
  ],
);

export const carrierDirectoryCache = pgTable(
  "carrier_directory_cache",
  {
    carrier: shipmentCarrier("carrier").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lookupKey: text("lookup_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    resourceType: text("resource_type").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("carrier_directory_cache_lookup_unique").on(
      table.carrier,
      table.resourceType,
      table.lookupKey,
    ),
    index("carrier_directory_cache_expires_at_idx").on(table.expiresAt),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type SessionRecord = typeof sessions.$inferSelect;
export type AccountRecord = typeof accounts.$inferSelect;
export type VerificationRecord = typeof verifications.$inferSelect;
export type ProductRecord = typeof products.$inferSelect;
export type ProductImageRecord = typeof productImages.$inferSelect;
export type CustomerRecord = typeof customers.$inferSelect;
export type OrderRecord = typeof orders.$inferSelect;
export type OrderItemRecord = typeof orderItems.$inferSelect;
export type PaymentRecord = typeof payments.$inferSelect;
export type OwnerShippingSettingsRecord =
  typeof ownerShippingSettings.$inferSelect;
export type ShipmentRecord = typeof shipments.$inferSelect;
export type OrderTagRecord = typeof orderTags.$inferSelect;
export type AuditEventRecord = typeof auditEvents.$inferSelect;
export type WebhookEventRecord = typeof webhookEvents.$inferSelect;
export type CarrierDirectoryCacheRecord =
  typeof carrierDirectoryCache.$inferSelect;
