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
  "MONOBANK",
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
  "MONOBANK",
  "NOVA_POSHTA",
  "UKRPOSHTA",
]);

export const users = pgTable("users", {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  email: text("email").notNull().unique(),
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  role: userRole("role").default("user").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
export type ProductRecord = typeof products.$inferSelect;
export type ProductImageRecord = typeof productImages.$inferSelect;
export type CustomerRecord = typeof customers.$inferSelect;
export type OrderRecord = typeof orders.$inferSelect;
export type OrderItemRecord = typeof orderItems.$inferSelect;
export type PaymentRecord = typeof payments.$inferSelect;
export type ShipmentRecord = typeof shipments.$inferSelect;
export type OrderTagRecord = typeof orderTags.$inferSelect;
export type AuditEventRecord = typeof auditEvents.$inferSelect;
export type WebhookEventRecord = typeof webhookEvents.$inferSelect;
export type CarrierDirectoryCacheRecord =
  typeof carrierDirectoryCache.$inferSelect;
