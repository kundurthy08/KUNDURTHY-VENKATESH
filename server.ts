import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  auditLogs,
  branches,
  inquiries,
  menuCategories,
  menuItems,
  offers,
  orderItems,
  orders,
  reservations,
  siteContent,
  users,
} from './src/db/schema.ts';
import { ensureInitialSeed } from './src/db/seed.ts';
import {
  type AuthRequest,
  optionalAuth,
  requireAuth,
  requireRole,
} from './src/middleware/auth.ts';
import {
  createAtomicReservation,
  createServerValidatedOrder,
  getAdminAnalytics,
  getSlotAvailability,
  recordAuditLog,
  verifySandboxPayment,
} from './src/services/cafeService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'charminar-cafe-api' });
});

// Public Bootstrap (categories, items, branches, offers, siteContent)
app.get('/api/public/bootstrap', async (_req, res) => {
  try {
    await ensureInitialSeed();
    const [branchList, categoryList, itemList, offerList, contentList] = await Promise.all([
      db.select().from(branches).where(eq(branches.active, true)).orderBy(asc(branches.id)),
      db
        .select()
        .from(menuCategories)
        .where(eq(menuCategories.active, true))
        .orderBy(asc(menuCategories.sortOrder)),
      db.select().from(menuItems).orderBy(asc(menuItems.id)),
      db.select().from(offers).where(eq(offers.active, true)).orderBy(asc(offers.id)),
      db.select().from(siteContent).orderBy(asc(siteContent.id)),
    ]);

    res.json({
      branches: branchList,
      categories: categoryList,
      items: itemList,
      offers: offerList,
      content: contentList,
    });
  } catch (error) {
    console.error('Bootstrap load error:', error);
    res.status(500).json({ error: 'Unable to load café catalogue at the moment.' });
  }
});

// Public Reservation Slot Availability
app.get('/api/public/reservations/availability', async (req, res) => {
  try {
    await ensureInitialSeed();
    const branchId = Number(req.query.branchId || 1);
    const date = String(req.query.date || '');
    const timeSlot = String(req.query.timeSlot || '');
    if (!date || !timeSlot || Number.isNaN(branchId)) {
      return res.status(400).json({ error: 'branchId, date, and timeSlot are required.' });
    }
    const availability = await getSlotAvailability(branchId, date, timeSlot);
    return res.json(availability);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unable to verify availability.';
    return res.status(400).json({ error: msg });
  }
});

const createOrderSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
  branchId: z.number().int().positive(),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(7).max(24),
  customerEmail: z.string().email().optional().or(z.literal('')),
  fulfilmentType: z.enum(['pickup', 'dine_in', 'delivery']),
  deliveryAddress: z.string().max(300).optional(),
  paymentMethod: z.enum(['sandbox_upi', 'sandbox_card', 'pay_at_counter']),
  offerCode: z.string().max(32).optional(),
  specialInstructions: z.string().max(400).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
        selectedOptionIds: z.array(z.string()).default([]),
      })
    )
    .min(1),
});

// Public Order Creation (with optional user linking)
app.post('/api/public/orders', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureInitialSeed();
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid order details.',
      });
    }
    if (
      parsed.data.fulfilmentType === 'delivery' &&
      (!parsed.data.deliveryAddress || parsed.data.deliveryAddress.trim().length < 8)
    ) {
      return res.status(400).json({ error: 'Please provide a complete delivery address.' });
    }

    const result = await createServerValidatedOrder({
      ...parsed.data,
      userId: req.dbUser?.id ?? null,
    });
    return res.status(result.deduplicated ? 200 : 201).json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Order creation failed.';
    return res.status(400).json({ error: msg });
  }
});

// Sandbox Payment Verification Endpoint
app.post('/api/public/orders/:orderNumber/sandbox-pay', async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '');
    const outcome = req.body?.outcome === 'fail' ? 'fail' : 'success';
    const updatedOrder = await verifySandboxPayment(orderNumber, outcome);
    return res.json({ order: updatedOrder });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Payment verification failed.';
    return res.status(400).json({ error: msg });
  }
});

// Public Order Lookup by Order Number
app.get('/api/public/orders/:orderNumber', async (req, res) => {
  try {
    const orderNumber = String(req.params.orderNumber || '').trim();
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, rows[0].id));
    return res.json({ order: rows[0], items });
  } catch (error) {
    console.error('Order lookup error:', error);
    return res.status(500).json({ error: 'Failed to retrieve order.' });
  }
});

const reservationSchema = z.object({
  branchId: z.number().int().positive(),
  guestName: z.string().min(2).max(120),
  guestPhone: z.string().min(7).max(24),
  guestEmail: z.string().email().optional().or(z.literal('')),
  reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(4).max(16),
  partySize: z.number().int().min(1).max(16),
  seatingPreference: z.string().min(2).max(80),
  notes: z.string().max(400).optional(),
});

// Public Table Reservation
app.post('/api/public/reservations', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureInitialSeed();
    const parsed = reservationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid reservation details.',
      });
    }
    const created = await createAtomicReservation({
      ...parsed.data,
      userId: req.dbUser?.id ?? null,
    });
    return res.status(201).json({ reservation: created });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unable to book table.';
    return res.status(400).json({ error: msg });
  }
});

app.get('/api/public/reservations/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    const rows = await db
      .select()
      .from(reservations)
      .where(eq(reservations.reservationCode, code))
      .limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }
    return res.json({ reservation: rows[0] });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch reservation.' });
  }
});

const inquirySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(24).optional(),
  subject: z.string().min(2).max(160),
  message: z.string().min(5).max(1500),
});

app.post('/api/public/inquiries', async (req, res) => {
  try {
    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid inquiry submission.',
      });
    }
    const inserted = await db
      .insert(inquiries)
      .values({
        name: parsed.data.name.trim(),
        email: parsed.data.email.trim(),
        phone: parsed.data.phone?.trim() || null,
        subject: parsed.data.subject.trim(),
        message: parsed.data.message.trim(),
      })
      .returning();
    return res.status(201).json({ inquiry: inserted[0] });
  } catch {
    return res.status(500).json({ error: 'Unable to submit message right now.' });
  }
});

// Authenticated User Account Routes
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  res.json({ user: req.dbUser });
});

app.get('/api/me/orders', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, req.dbUser.id))
      .orderBy(desc(orders.createdAt));

    const allLines = await db.select().from(orderItems);
    const linesByOrder = new Map<number, typeof allLines>();
    for (const line of allLines) {
      const list = linesByOrder.get(line.orderId) || [];
      list.push(line);
      linesByOrder.set(line.orderId, list);
    }

    return res.json({
      orders: userOrders.map((o) => ({ ...o, items: linesByOrder.get(o.id) || [] })),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to load your order history.' });
  }
});

app.get('/api/me/reservations', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: 'Unauthorized' });
    const rows = await db
      .select()
      .from(reservations)
      .where(eq(reservations.userId, req.dbUser.id))
      .orderBy(desc(reservations.createdAt));
    return res.json({ reservations: rows });
  } catch {
    return res.status(500).json({ error: 'Failed to load your reservations.' });
  }
});

// Admin / Staff Protected Operations Routes
const STAFF_ROLES: Array<'owner' | 'manager' | 'order_staff' | 'content_editor'> = [
  'owner',
  'manager',
  'order_staff',
  'content_editor',
];

app.get('/api/admin/overview', requireAuth, requireRole(STAFF_ROLES), async (req: AuthRequest, res) => {
  try {
    await ensureInitialSeed();
    const [
      analytics,
      orderList,
      orderItemList,
      reservationList,
      categoryList,
      menuList,
      offerList,
      branchList,
      contentList,
      inquiryList,
      userList,
      auditList,
    ] = await Promise.all([
      getAdminAnalytics(),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100),
      db.select().from(orderItems),
      db.select().from(reservations).orderBy(desc(reservations.createdAt)).limit(100),
      db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder)),
      db.select().from(menuItems).orderBy(asc(menuItems.id)),
      db.select().from(offers).orderBy(asc(offers.id)),
      db.select().from(branches).orderBy(asc(branches.id)),
      db.select().from(siteContent).orderBy(asc(siteContent.id)),
      db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(50),
      req.dbUser?.role === 'owner'
        ? db.select().from(users).orderBy(asc(users.id))
        : Promise.resolve([]),
      db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(60),
    ]);

    const itemsByOrder = new Map<number, typeof orderItemList>();
    for (const line of orderItemList) {
      const arr = itemsByOrder.get(line.orderId) || [];
      arr.push(line);
      itemsByOrder.set(line.orderId, arr);
    }

    res.json({
      analytics,
      orders: orderList.map((o) => ({ ...o, items: itemsByOrder.get(o.id) || [] })),
      reservations: reservationList,
      categories: categoryList,
      menuItems: menuList,
      offers: offerList,
      branches: branchList,
      content: contentList,
      inquiries: inquiryList,
      users: userList,
      auditLogs: auditList,
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    res.status(500).json({ error: 'Unable to load admin operations dashboard.' });
  }
});

app.patch(
  '/api/admin/orders/:id/status',
  requireAuth,
  requireRole(['owner', 'manager', 'order_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '');
      const allowed = [
        'placed',
        'accepted',
        'preparing',
        'ready',
        'completed',
        'cancelled',
        'refunded',
      ];
      if (!allowed.includes(status) || Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid order status transition.' });
      }
      if ((status === 'cancelled' || status === 'refunded') && req.dbUser?.role === 'order_staff') {
        return res.status(403).json({ error: 'Only managers or owners may cancel or refund orders.' });
      }

      const patchData: Record<string, unknown> = { status, updatedAt: new Date() };
      if (status === 'refunded') {
        patchData.paymentStatus = 'refunded';
      } else if (status === 'completed') {
        patchData.paymentStatus = 'verified';
      }

      const updated = await db
        .update(orders)
        .set(patchData)
        .where(eq(orders.id, id))
        .returning();
      if (updated.length === 0) return res.status(404).json({ error: 'Order not found.' });

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'orders',
        entityId: updated[0].orderNumber,
        summary: `Changed order ${updated[0].orderNumber} status to ${status}`,
      });

      return res.json({ order: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to update order status.' });
    }
  }
);

app.patch(
  '/api/admin/reservations/:id/status',
  requireAuth,
  requireRole(['owner', 'manager', 'order_staff']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '');
      const allowed = ['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show'];
      if (!allowed.includes(status) || Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid reservation status.' });
      }
      const updated = await db
        .update(reservations)
        .set({ status, updatedAt: new Date() })
        .where(eq(reservations.id, id))
        .returning();
      if (updated.length === 0) return res.status(404).json({ error: 'Reservation not found.' });

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'UPDATE_RESERVATION_STATUS',
        entity: 'reservations',
        entityId: updated[0].reservationCode,
        summary: `Marked reservation ${updated[0].reservationCode} as ${status}`,
      });

      return res.json({ reservation: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to update reservation.' });
    }
  }
);

const menuItemMutationSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(2).max(120),
  description: z.string().min(5).max(500),
  basePricePaise: z.number().int().min(100).max(5000000),
  taxRateBps: z.number().int().min(0).max(2800).default(500),
  imageUrl: z.string().min(1).max(500),
  dietaryTag: z.string().min(2).max(40).default('Vegetarian'),
  allergenNote: z.string().max(240).default(''),
  isSignature: z.boolean().default(false),
  isDraftSample: z.boolean().default(false),
  available: z.boolean().default(true),
});

app.post(
  '/api/admin/menu/items',
  requireAuth,
  requireRole(['owner', 'manager', 'content_editor']),
  async (req: AuthRequest, res) => {
    try {
      const parsed = menuItemMutationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid menu item.' });
      }
      const slug = `${parsed.data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;

      const inserted = await db
        .insert(menuItems)
        .values({
          ...parsed.data,
          slug,
          modifiersJson: [],
        })
        .returning();

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'CREATE_MENU_ITEM',
        entity: 'menu_items',
        entityId: String(inserted[0].id),
        summary: `Added menu item "${inserted[0].name}"`,
      });

      return res.status(201).json({ item: inserted[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to create menu item.' });
    }
  }
);

app.patch(
  '/api/admin/menu/items/:id',
  requireAuth,
  requireRole(['owner', 'manager', 'content_editor']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid item id.' });
      const parsed = menuItemMutationSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid updates.' });
      }
      const updated = await db
        .update(menuItems)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();
      if (updated.length === 0) return res.status(404).json({ error: 'Menu item not found.' });

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'UPDATE_MENU_ITEM',
        entity: 'menu_items',
        entityId: String(id),
        summary: `Updated "${updated[0].name}" (available: ${updated[0].available}, price: ₹${(
          updated[0].basePricePaise / 100
        ).toFixed(0)})`,
      });

      return res.json({ item: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to update menu item.' });
    }
  }
);

app.patch(
  '/api/admin/branches/:id',
  requireAuth,
  requireRole(['owner', 'manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const schema = z.object({
        name: z.string().min(2).max(160),
        addressLine: z.string().min(4).max(300),
        city: z.string().min(2).max(100),
        phone: z.string().min(5).max(40),
        email: z.string().email(),
        openingHours: z.string().min(3).max(160),
        mapUrl: z.string().url(),
        totalSeats: z.number().int().min(4).max(500),
        isVerified: z.boolean().default(true),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success || Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid branch details.' });
      }
      const updated = await db
        .update(branches)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(branches.id, id))
        .returning();
      if (updated.length === 0) return res.status(404).json({ error: 'Branch not found.' });

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'UPDATE_BRANCH',
        entity: 'branches',
        entityId: String(id),
        summary: `Updated branch "${updated[0].name}" (verified: ${updated[0].isVerified})`,
      });

      return res.json({ branch: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to update branch details.' });
    }
  }
);

app.patch(
  '/api/admin/content/:key',
  requireAuth,
  requireRole(['owner', 'manager', 'content_editor']),
  async (req: AuthRequest, res) => {
    try {
      const key = String(req.params.key || '');
      const schema = z.object({
        title: z.string().min(2).max(200),
        body: z.string().min(5).max(4000),
        isVerified: z.boolean().default(true),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid content payload.' });
      }
      const updated = await db
        .update(siteContent)
        .set({
          title: parsed.data.title,
          body: parsed.data.body,
          isVerified: parsed.data.isVerified,
          updatedBy: req.dbUser!.email,
          updatedAt: new Date(),
        })
        .where(eq(siteContent.key, key))
        .returning();

      if (updated.length === 0) return res.status(404).json({ error: 'Content block not found.' });

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'UPDATE_SITE_CONTENT',
        entity: 'site_content',
        entityId: key,
        summary: `Updated site copy "${key}" (verified: ${parsed.data.isVerified})`,
      });

      return res.json({ content: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to update site content.' });
    }
  }
);

app.post(
  '/api/admin/offers',
  requireAuth,
  requireRole(['owner', 'manager']),
  async (req: AuthRequest, res) => {
    try {
      const schema = z.object({
        code: z.string().min(3).max(24),
        title: z.string().min(3).max(160),
        description: z.string().min(5).max(300),
        discountType: z.enum(['percent', 'flat_paise']),
        discountValue: z.number().int().positive(),
        minOrderPaise: z.number().int().min(0).default(0),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid offer parameters.' });
      }
      const inserted = await db
        .insert(offers)
        .values({
          ...parsed.data,
          code: parsed.data.code.trim().toUpperCase(),
        })
        .returning();

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'CREATE_OFFER',
        entity: 'offers',
        entityId: inserted[0].code,
        summary: `Created offer ${inserted[0].code}`,
      });

      return res.status(201).json({ offer: inserted[0] });
    } catch {
      return res.status(400).json({ error: 'Offer code already exists or is invalid.' });
    }
  }
);

app.patch(
  '/api/admin/offers/:id',
  requireAuth,
  requireRole(['owner', 'manager']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const active = Boolean(req.body?.active);
      const updated = await db
        .update(offers)
        .set({ active })
        .where(eq(offers.id, id))
        .returning();
      if (updated.length === 0) return res.status(404).json({ error: 'Offer not found.' });

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'TOGGLE_OFFER',
        entity: 'offers',
        entityId: updated[0].code,
        summary: `Set offer ${updated[0].code} active=${active}`,
      });

      return res.json({ offer: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to update offer.' });
    }
  }
);

app.patch(
  '/api/admin/users/:id/role',
  requireAuth,
  requireRole(['owner']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const role = String(req.body?.role || '');
      const allowed = ['owner', 'manager', 'order_staff', 'content_editor', 'customer'];
      if (!allowed.includes(role) || Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid role assignment.' });
      }
      const updated = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      if (updated.length === 0) return res.status(404).json({ error: 'User not found.' });

      await recordAuditLog({
        actorUid: req.dbUser!.uid,
        actorEmail: req.dbUser!.email,
        actorRole: req.dbUser!.role,
        action: 'UPDATE_USER_ROLE',
        entity: 'users',
        entityId: String(id),
        summary: `Assigned role "${role}" to ${updated[0].email}`,
      });

      return res.json({ user: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to assign role.' });
    }
  }
);

app.patch(
  '/api/admin/inquiries/:id',
  requireAuth,
  requireRole(['owner', 'manager', 'content_editor']),
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || 'resolved');
      const updated = await db
        .update(inquiries)
        .set({ status })
        .where(eq(inquiries.id, id))
        .returning();
      if (updated.length === 0) return res.status(404).json({ error: 'Inquiry not found.' });
      return res.json({ inquiry: updated[0] });
    } catch {
      return res.status(500).json({ error: 'Failed to update inquiry.' });
    }
  }
);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Charminar Café server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
