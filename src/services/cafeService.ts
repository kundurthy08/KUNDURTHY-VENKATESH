import crypto from 'crypto';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  auditLogs,
  branches,
  menuCategories,
  menuItems,
  offers,
  orderItems,
  orders,
  reservations,
  siteContent,
  type SelectedModifierSnapshot,
} from '../db/schema.ts';

export interface OrderLineInput {
  menuItemId: number;
  quantity: number;
  selectedOptionIds: string[];
}

export interface CreateOrderInput {
  idempotencyKey: string;
  userId: number | null;
  branchId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  fulfilmentType: 'pickup' | 'dine_in' | 'delivery';
  deliveryAddress?: string;
  paymentMethod: 'sandbox_upi' | 'sandbox_card' | 'pay_at_counter';
  offerCode?: string;
  specialInstructions?: string;
  items: OrderLineInput[];
}

export async function createServerValidatedOrder(input: CreateOrderInput) {
  try {
    return await db.transaction(async (tx) => {
      // Idempotency guard: prevent duplicate orders on double clicks or retries
      const existing = await tx
        .select()
        .from(orders)
        .where(eq(orders.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (existing.length > 0) {
        const existingLines = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, existing[0].id));
        return { order: existing[0], items: existingLines, deduplicated: true };
      }

      const branchRows = await tx
        .select()
        .from(branches)
        .where(and(eq(branches.id, input.branchId), eq(branches.active, true)))
        .limit(1);
      if (branchRows.length === 0) {
        throw new Error('Selected café branch is not currently active.');
      }

      const itemIds = [...new Set(input.items.map((i) => i.menuItemId))];
      if (itemIds.length === 0) {
        throw new Error('Cannot place an empty order.');
      }

      const dbMenuItems = await tx
        .select()
        .from(menuItems)
        .where(inArray(menuItems.id, itemIds));
      const itemMap = new Map(dbMenuItems.map((m) => [m.id, m]));

      let subtotalPaise = 0;
      let totalTaxPaise = 0;

      const preparedLines: Array<{
        menuItemId: number;
        itemNameSnapshot: string;
        unitPricePaiseSnapshot: number;
        taxRateBpsSnapshot: number;
        quantity: number;
        modifiersSnapshot: SelectedModifierSnapshot[];
        lineTotalPaise: number;
      }> = [];

      for (const reqLine of input.items) {
        const menuItem = itemMap.get(reqLine.menuItemId);
        if (!menuItem) {
          throw new Error('One or more selected menu items could not be found.');
        }
        if (!menuItem.available) {
          throw new Error(`"${menuItem.name}" is currently unavailable.`);
        }
        if (reqLine.quantity < 1 || reqLine.quantity > 50) {
          throw new Error(`Invalid quantity for "${menuItem.name}".`);
        }

        const chosenModifiers: SelectedModifierSnapshot[] = [];
        let modifierDeltaPaise = 0;

        for (const group of menuItem.modifiersJson || []) {
          const matchedOptions = group.options.filter((opt) =>
            reqLine.selectedOptionIds.includes(opt.id)
          );
          if (group.required && matchedOptions.length === 0) {
            throw new Error(`Please select "${group.name}" for ${menuItem.name}.`);
          }
          if (matchedOptions.length > group.maxSelect) {
            throw new Error(`Too many options selected for "${group.name}".`);
          }
          for (const opt of matchedOptions) {
            chosenModifiers.push({
              groupName: group.name,
              optionLabel: opt.label,
              priceDeltaPaise: opt.priceDeltaPaise,
            });
            modifierDeltaPaise += opt.priceDeltaPaise;
          }
        }

        const unitPrice = menuItem.basePricePaise + modifierDeltaPaise;
        const lineSubtotal = unitPrice * reqLine.quantity;
        subtotalPaise += lineSubtotal;

        preparedLines.push({
          menuItemId: menuItem.id,
          itemNameSnapshot: menuItem.name,
          unitPricePaiseSnapshot: unitPrice,
          taxRateBpsSnapshot: menuItem.taxRateBps,
          quantity: reqLine.quantity,
          modifiersSnapshot: chosenModifiers,
          lineTotalPaise: lineSubtotal,
        });
      }

      let discountPaise = 0;
      let appliedOfferCode: string | null = null;
      if (input.offerCode && input.offerCode.trim().length > 0) {
        const normalizedCode = input.offerCode.trim().toUpperCase();
        const offerRows = await tx
          .select()
          .from(offers)
          .where(and(eq(offers.code, normalizedCode), eq(offers.active, true)))
          .limit(1);

        if (offerRows.length === 0) {
          throw new Error(`Offer code "${normalizedCode}" is invalid or inactive.`);
        }
        const offer = offerRows[0];
        if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
          throw new Error(`Offer code "${normalizedCode}" has expired.`);
        }
        if (offer.maxUses !== null && offer.usedCount >= offer.maxUses) {
          throw new Error(`Offer code "${normalizedCode}" has reached its usage limit.`);
        }
        if (subtotalPaise < offer.minOrderPaise) {
          throw new Error(
            `Minimum order of ₹${(offer.minOrderPaise / 100).toFixed(0)} required for ${normalizedCode}.`
          );
        }

        if (offer.discountType === 'percent') {
          discountPaise = Math.round((subtotalPaise * offer.discountValue) / 100);
        } else {
          discountPaise = Math.min(offer.discountValue, subtotalPaise);
        }
        appliedOfferCode = offer.code;

        await tx
          .update(offers)
          .set({ usedCount: sql`${offers.usedCount} + 1` })
          .where(eq(offers.id, offer.id));
      }

      const taxableBase = Math.max(0, subtotalPaise - discountPaise);
      // Proportional tax calculation based on snapshot rates
      for (const line of preparedLines) {
        const lineShare = subtotalPaise > 0 ? line.lineTotalPaise / subtotalPaise : 0;
        const discountedLine = Math.round(taxableBase * lineShare);
        totalTaxPaise += Math.round((discountedLine * line.taxRateBpsSnapshot) / 10000);
      }

      const deliveryFeePaise = input.fulfilmentType === 'delivery' ? 4000 : 0;
      const totalPaise = taxableBase + totalTaxPaise + deliveryFeePaise;

      const isOnlineSandbox =
        input.paymentMethod === 'sandbox_upi' || input.paymentMethod === 'sandbox_card';
      const initialOrderStatus = isOnlineSandbox ? 'pending_payment' : 'placed';
      const initialPaymentStatus = isOnlineSandbox ? 'pending' : 'pay_at_counter';
      const orderNumber = `CC-${Date.now().toString().slice(-6)}-${crypto
        .randomBytes(2)
        .toString('hex')
        .toUpperCase()}`;

      const insertedOrderRows = await tx
        .insert(orders)
        .values({
          orderNumber,
          idempotencyKey: input.idempotencyKey,
          userId: input.userId,
          branchId: input.branchId,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone.trim(),
          customerEmail: input.customerEmail?.trim() || null,
          fulfilmentType: input.fulfilmentType,
          deliveryAddress:
            input.fulfilmentType === 'delivery' ? input.deliveryAddress?.trim() || '' : null,
          status: initialOrderStatus,
          paymentStatus: initialPaymentStatus,
          paymentMethod: input.paymentMethod,
          offerCode: appliedOfferCode,
          subtotalPaise,
          discountPaise,
          taxPaise: totalTaxPaise,
          deliveryFeePaise,
          totalPaise,
          specialInstructions: input.specialInstructions?.trim() || null,
        })
        .returning();

      const createdOrder = insertedOrderRows[0];

      const insertedItems = await tx
        .insert(orderItems)
        .values(
          preparedLines.map((line) => ({
            orderId: createdOrder.id,
            ...line,
          }))
        )
        .returning();

      return { order: createdOrder, items: insertedItems, deduplicated: false };
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes('Failed')) {
      throw error;
    }
    throw new Error('Could not create order.', { cause: error });
  }
}

export async function verifySandboxPayment(
  orderNumber: string,
  outcome: 'success' | 'fail'
) {
  try {
    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);
      if (rows.length === 0) {
        throw new Error('Order not found.');
      }
      const order = rows[0];
      if (order.paymentStatus === 'verified') {
        return order;
      }

      if (outcome === 'success') {
        const ref = `SBX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const updated = await tx
          .update(orders)
          .set({
            status: 'placed',
            paymentStatus: 'verified',
            paymentReference: ref,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id))
          .returning();
        return updated[0];
      } else {
        const updated = await tx
          .update(orders)
          .set({
            status: 'payment_failed',
            paymentStatus: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, order.id))
          .returning();
        return updated[0];
      }
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Payment verification failed.', { cause: error });
  }
}

export async function getSlotAvailability(
  branchId: number,
  reservationDate: string,
  timeSlot: string
) {
  try {
    const branchRows = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);
    if (branchRows.length === 0) {
      throw new Error('Branch not found.');
    }
    const branch = branchRows[0];

    const bookedResult = await db
      .select({
        bookedSeats: sql<number>`coalesce(sum(${reservations.partySize}), 0)::int`,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.branchId, branchId),
          eq(reservations.reservationDate, reservationDate),
          eq(reservations.timeSlot, timeSlot),
          inArray(reservations.status, ['pending', 'confirmed'])
        )
      );

    const bookedSeats = bookedResult[0]?.bookedSeats ?? 0;
    const remainingSeats = Math.max(0, branch.totalSeats - bookedSeats);
    return {
      totalSeats: branch.totalSeats,
      bookedSeats,
      remainingSeats,
    };
  } catch (error) {
    console.error('Availability check error:', error);
    throw new Error('Failed to check table availability.', { cause: error });
  }
}

export async function createAtomicReservation(input: {
  userId: number | null;
  branchId: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  reservationDate: string;
  timeSlot: string;
  partySize: number;
  seatingPreference: string;
  notes?: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      // Lock branch row to serialize concurrent capacity checks for the same slot
      const branchLock = await tx.execute(
        sql`SELECT id, total_seats FROM branches WHERE id = ${input.branchId} AND active = true FOR UPDATE`
      );
      if (branchLock.rows.length === 0) {
        throw new Error('Selected branch is unavailable.');
      }
      const totalSeats = Number(branchLock.rows[0].total_seats);

      const bookedResult = await tx
        .select({
          bookedSeats: sql<number>`coalesce(sum(${reservations.partySize}), 0)::int`,
        })
        .from(reservations)
        .where(
          and(
            eq(reservations.branchId, input.branchId),
            eq(reservations.reservationDate, input.reservationDate),
            eq(reservations.timeSlot, input.timeSlot),
            inArray(reservations.status, ['pending', 'confirmed'])
          )
        );

      const bookedSeats = bookedResult[0]?.bookedSeats ?? 0;
      if (bookedSeats + input.partySize > totalSeats) {
        throw new Error(
          `Only ${Math.max(0, totalSeats - bookedSeats)} seats remain for ${input.timeSlot} on ${input.reservationDate}.`
        );
      }

      const reservationCode = `RES-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const inserted = await tx
        .insert(reservations)
        .values({
          reservationCode,
          userId: input.userId,
          branchId: input.branchId,
          guestName: input.guestName.trim(),
          guestPhone: input.guestPhone.trim(),
          guestEmail: input.guestEmail?.trim() || null,
          reservationDate: input.reservationDate,
          timeSlot: input.timeSlot,
          partySize: input.partySize,
          seatingPreference: input.seatingPreference,
          status: 'pending',
          notes: input.notes?.trim() || null,
        })
        .returning();

      return inserted[0];
    });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to create reservation.', { cause: error });
  }
}

export async function recordAuditLog(params: {
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
}) {
  try {
    await db.insert(auditLogs).values(params);
  } catch (error) {
    console.error('Audit log insert failed:', error);
  }
}

export async function getAdminAnalytics() {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allOrderItems = await db.select().from(orderItems);
    const allCategories = await db.select().from(menuCategories);
    const allItems = await db.select().from(menuItems);

    const activeOrders = allOrders.filter(
      (o) => o.status !== 'cancelled' && o.status !== 'payment_failed' && o.status !== 'refunded'
    );
    const refundedOrders = allOrders.filter((o) => o.status === 'refunded');
    const cancelledCount = allOrders.filter((o) => o.status === 'cancelled').length;

    const grossItemSalesPaise = activeOrders.reduce((sum, o) => sum + o.subtotalPaise, 0);
    const discountsPaise = activeOrders.reduce((sum, o) => sum + o.discountPaise, 0);
    const taxPaise = activeOrders.reduce((sum, o) => sum + o.taxPaise, 0);
    const deliveryFeesPaise = activeOrders.reduce((sum, o) => sum + o.deliveryFeePaise, 0);
    const refundsPaise = refundedOrders.reduce((sum, o) => sum + o.totalPaise, 0);
    const netCollectedPaise = activeOrders
      .filter((o) => o.paymentStatus === 'verified' || o.status === 'completed')
      .reduce((sum, o) => sum + o.totalPaise, 0);
    const totalOrderVolumePaise = activeOrders.reduce((sum, o) => sum + o.totalPaise, 0);
    const averageOrderValuePaise =
      activeOrders.length > 0 ? Math.round(totalOrderVolumePaise / activeOrders.length) : 0;

    const activeOrderIds = new Set(activeOrders.map((o) => o.id));
    const itemMixMap = new Map<string, { name: string; quantity: number; revenuePaise: number }>();
    for (const line of allOrderItems) {
      if (!activeOrderIds.has(line.orderId)) continue;
      const existing = itemMixMap.get(line.itemNameSnapshot) || {
        name: line.itemNameSnapshot,
        quantity: 0,
        revenuePaise: 0,
      };
      existing.quantity += line.quantity;
      existing.revenuePaise += line.lineTotalPaise;
      itemMixMap.set(line.itemNameSnapshot, existing);
    }

    const topItems = [...itemMixMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    return {
      orderCount: allOrders.length,
      activeOrderCount: activeOrders.length,
      cancelledCount,
      grossItemSalesPaise,
      discountsPaise,
      taxPaise,
      deliveryFeesPaise,
      refundsPaise,
      netCollectedPaise,
      totalOrderVolumePaise,
      averageOrderValuePaise,
      topItems,
      statusCounts,
      catalogCount: allItems.length,
      categoryCount: allCategories.length,
    };
  } catch (error) {
    console.error('Analytics aggregation failed:', error);
    throw new Error('Failed to compute analytics.', { cause: error });
  }
}
