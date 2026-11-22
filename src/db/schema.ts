import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export interface ModifierOption {
  id: string;
  label: string;
  priceDeltaPaise: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  maxSelect: number;
  options: ModifierOption[];
}

export interface SelectedModifierSnapshot {
  groupName: string;
  optionLabel: string;
  priceDeltaPaise: number;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  phone: text('phone'),
  role: text('role').notNull().default('customer'), // owner | manager | order_staff | content_editor | customer
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  addressLine: text('address_line').notNull(),
  city: text('city').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  openingHours: text('opening_hours').notNull(),
  mapUrl: text('map_url').notNull(),
  totalSeats: integer('total_seats').notNull().default(36),
  slotDurationMinutes: integer('slot_duration_minutes').notNull().default(90),
  isVerified: boolean('is_verified').notNull().default(false),
  active: boolean('active').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const menuCategories = pgTable('menu_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .references(() => menuCategories.id)
    .notNull(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  basePricePaise: integer('base_price_paise').notNull(),
  taxRateBps: integer('tax_rate_bps').notNull().default(500),
  imageUrl: text('image_url').notNull(),
  dietaryTag: text('dietary_tag').notNull().default('Vegetarian'),
  allergenNote: text('allergen_note').notNull().default(''),
  isSignature: boolean('is_signature').notNull().default(false),
  isDraftSample: boolean('is_draft_sample').notNull().default(true),
  available: boolean('available').notNull().default(true),
  modifiersJson: jsonb('modifiers_json').$type<ModifierGroup[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const offers = pgTable('offers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  discountType: text('discount_type').notNull().default('percent'), // percent | flat_paise
  discountValue: integer('discount_value').notNull(),
  minOrderPaise: integer('min_order_paise').notNull().default(0),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  active: boolean('active').notNull().default(true),
  validUntil: timestamp('valid_until'),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  branchId: integer('branch_id')
    .references(() => branches.id)
    .notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  fulfilmentType: text('fulfilment_type').notNull().default('pickup'), // pickup | dine_in | delivery
  deliveryAddress: text('delivery_address'),
  status: text('status').notNull().default('placed'), // pending_payment | placed | accepted | preparing | ready | completed | payment_failed | cancelled | refunded
  paymentStatus: text('payment_status').notNull().default('pay_at_counter'), // pending | verified | pay_at_counter | failed | refunded
  paymentMethod: text('payment_method').notNull().default('pay_at_counter'), // sandbox_upi | sandbox_card | pay_at_counter
  paymentReference: text('payment_reference'),
  offerCode: text('offer_code'),
  subtotalPaise: integer('subtotal_paise').notNull(),
  discountPaise: integer('discount_paise').notNull().default(0),
  taxPaise: integer('tax_paise').notNull(),
  deliveryFeePaise: integer('delivery_fee_paise').notNull().default(0),
  totalPaise: integer('total_paise').notNull(),
  specialInstructions: text('special_instructions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .references(() => orders.id)
    .notNull(),
  menuItemId: integer('menu_item_id')
    .references(() => menuItems.id)
    .notNull(),
  itemNameSnapshot: text('item_name_snapshot').notNull(),
  unitPricePaiseSnapshot: integer('unit_price_paise_snapshot').notNull(),
  taxRateBpsSnapshot: integer('tax_rate_bps_snapshot').notNull(),
  quantity: integer('quantity').notNull(),
  modifiersSnapshot: jsonb('modifiers_snapshot')
    .$type<SelectedModifierSnapshot[]>()
    .notNull()
    .default([]),
  lineTotalPaise: integer('line_total_paise').notNull(),
});

export const reservations = pgTable('reservations', {
  id: serial('id').primaryKey(),
  reservationCode: text('reservation_code').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  branchId: integer('branch_id')
    .references(() => branches.id)
    .notNull(),
  guestName: text('guest_name').notNull(),
  guestPhone: text('guest_phone').notNull(),
  guestEmail: text('guest_email'),
  reservationDate: text('reservation_date').notNull(),
  timeSlot: text('time_slot').notNull(),
  partySize: integer('party_size').notNull(),
  seatingPreference: text('seating_preference').notNull().default('Heritage Arch Alcove'),
  status: text('status').notNull().default('pending'), // pending | confirmed | declined | cancelled | completed | no_show
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteContent = pgTable('site_content', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isVerified: boolean('is_verified').notNull().default(false),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUid: text('actor_uid').notNull(),
  actorEmail: text('actor_email').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
