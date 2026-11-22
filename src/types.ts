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

export interface Branch {
  id: number;
  slug: string;
  name: string;
  addressLine: string;
  city: string;
  phone: string;
  email: string;
  openingHours: string;
  mapUrl: string;
  totalSeats: number;
  slotDurationMinutes: number;
  isVerified: boolean;
  active: boolean;
}

export interface MenuCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  slug: string;
  name: string;
  description: string;
  basePricePaise: number;
  taxRateBps: number;
  imageUrl: string;
  dietaryTag: string;
  allergenNote: string;
  isSignature: boolean;
  isDraftSample: boolean;
  available: boolean;
  modifiersJson: ModifierGroup[];
}

export interface Offer {
  id: number;
  code: string;
  title: string;
  description: string;
  discountType: 'percent' | 'flat_paise';
  discountValue: number;
  minOrderPaise: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

export interface SiteContentBlock {
  id: number;
  key: string;
  title: string;
  body: string;
  isVerified: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface CartItem {
  cartKey: string;
  menuItem: MenuItem;
  quantity: number;
  selectedOptionIds: string[];
  selectedOptionLabels: string[];
  unitPricePaise: number;
}

export interface OrderItemSnapshot {
  id: number;
  orderId: number;
  menuItemId: number;
  itemNameSnapshot: string;
  unitPricePaiseSnapshot: number;
  taxRateBpsSnapshot: number;
  quantity: number;
  modifiersSnapshot: Array<{
    groupName: string;
    optionLabel: string;
    priceDeltaPaise: number;
  }>;
  lineTotalPaise: number;
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  branchId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  fulfilmentType: 'pickup' | 'dine_in' | 'delivery';
  deliveryAddress: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference: string | null;
  offerCode: string | null;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  specialInstructions: string | null;
  createdAt: string;
  items?: OrderItemSnapshot[];
}

export interface ReservationRecord {
  id: number;
  reservationCode: string;
  branchId: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  reservationDate: string;
  timeSlot: string;
  partySize: number;
  seatingPreference: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'owner' | 'manager' | 'order_staff' | 'content_editor' | 'customer';
}

export interface AdminAnalytics {
  orderCount: number;
  activeOrderCount: number;
  cancelledCount: number;
  grossItemSalesPaise: number;
  discountsPaise: number;
  taxPaise: number;
  deliveryFeesPaise: number;
  refundsPaise: number;
  netCollectedPaise: number;
  totalOrderVolumePaise: number;
  averageOrderValuePaise: number;
  topItems: Array<{ name: string; quantity: number; revenuePaise: number }>;
  statusCounts: Record<string, number>;
  catalogCount: number;
  categoryCount: number;
}

export interface InquiryRecord {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: number;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export type AppRoute =
  | 'home'
  | 'story'
  | 'menu'
  | 'reservations'
  | 'contact'
  | 'portal'
  | 'policies';

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}
