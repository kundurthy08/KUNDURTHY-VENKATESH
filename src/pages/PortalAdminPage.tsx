import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarCheck,
  ChefHat,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import {
  formatINR,
  type AdminAnalytics,
  type AuditLogRecord,
  type Branch,
  type InquiryRecord,
  type MenuCategory,
  type MenuItem,
  type Offer,
  type OrderRecord,
  type ReservationRecord,
  type SiteContentBlock,
  type UserProfile,
} from '../types';

type AdminTab = 'analytics' | 'orders' | 'reservations' | 'menu' | 'governance';

interface AdminOverviewData {
  analytics: AdminAnalytics;
  orders: OrderRecord[];
  reservations: ReservationRecord[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  offers: Offer[];
  branches: Branch[];
  content: SiteContentBlock[];
  inquiries: InquiryRecord[];
  users: UserProfile[];
  auditLogs: AuditLogRecord[];
}

export const PortalAdminPage: React.FC = () => {
  const {
    firebaseUser,
    dbUser,
    authLoading,
    signInWithGoogle,
    logout,
    getIdToken,
    refreshBootstrap,
  } = useCafe();

  const [myOrders, setMyOrders] = useState<OrderRecord[]>([]);
  const [myReservations, setMyReservations] = useState<ReservationRecord[]>([]);
  const [adminData, setAdminData] = useState<AdminOverviewData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('analytics');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // New menu item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState<number>(1);
  const [newItemPriceRupees, setNewItemPriceRupees] = useState('160');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemDietary, setNewItemDietary] = useState('Vegetarian');
  const [newItemSignature, setNewItemSignature] = useState(false);

  // Branch edit state
  const [branchEdit, setBranchEdit] = useState<Branch | null>(null);

  // Content edit state
  const [editingContentKey, setEditingContentKey] = useState<string>('our_story');
  const [contentTitle, setContentTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [contentVerified, setContentVerified] = useState(true);

  // New Offer state
  const [offerCode, setOfferCode] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPercent, setOfferPercent] = useState('15');
  const [offerMinRupees, setOfferMinRupees] = useState('300');

  const isStaff = Boolean(dbUser && dbUser.role !== 'customer');

  const loadPortalData = useCallback(async () => {
    if (!firebaseUser) return;
    setLoadingData(true);
    setActionError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [ordersRes, resvRes] = await Promise.all([
        fetch('/api/me/orders', { headers }),
        fetch('/api/me/reservations', { headers }),
      ]);
      if (ordersRes.ok) {
        const od = await ordersRes.json();
        setMyOrders(od.orders || []);
      }
      if (resvRes.ok) {
        const rd = await resvRes.json();
        setMyReservations(rd.reservations || []);
      }

      if (dbUser && dbUser.role !== 'customer') {
        const adminRes = await fetch('/api/admin/overview', { headers });
        if (adminRes.ok) {
          const data: AdminOverviewData = await adminRes.json();
          setAdminData(data);
          if (data.categories.length > 0 && newItemCategoryId === 1) {
            setNewItemCategoryId(data.categories[0].id);
          }
          if (data.branches.length > 0) {
            setBranchEdit(data.branches[0]);
          }
          const initialContent = data.content.find((c) => c.key === editingContentKey) || data.content[0];
          if (initialContent) {
            setEditingContentKey(initialContent.key);
            setContentTitle(initialContent.title);
            setContentBody(initialContent.body);
            setContentVerified(initialContent.isVerified);
          }
        }
      }
    } catch {
      setActionError('Unable to refresh portal data.');
    } finally {
      setLoadingData(false);
    }
  }, [firebaseUser, dbUser, getIdToken, editingContentKey, newItemCategoryId]);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const authedRequest = async (url: string, method: string, body?: unknown) => {
    const token = await getIdToken();
    if (!token) throw new Error('Session expired. Please sign in again.');
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Action failed');
    return data;
  };

  const handleOrderStatus = async (orderId: number, status: string) => {
    try {
      setActionError(null);
      await authedRequest(`/api/admin/orders/${orderId}/status`, 'PATCH', { status });
      setActionSuccess(`Order updated to "${status}".`);
      await loadPortalData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleReservationStatus = async (resId: number, status: string) => {
    try {
      setActionError(null);
      await authedRequest(`/api/admin/reservations/${resId}/status`, 'PATCH', { status });
      setActionSuccess(`Reservation marked "${status}".`);
      await loadPortalData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      setActionError(null);
      await authedRequest(`/api/admin/menu/items/${item.id}`, 'PATCH', {
        available: !item.available,
      });
      setActionSuccess(`"${item.name}" marked ${!item.available ? 'Available' : 'Sold Out'}.`);
      await Promise.all([loadPortalData(), refreshBootstrap()]);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update menu item.');
    }
  };

  const handleApproveDraftItem = async (item: MenuItem) => {
    try {
      setActionError(null);
      await authedRequest(`/api/admin/menu/items/${item.id}`, 'PATCH', {
        isDraftSample: false,
      });
      setActionSuccess(`"${item.name}" published as owner-approved menu item.`);
      await Promise.all([loadPortalData(), refreshBootstrap()]);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve menu item.');
    }
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError(null);
      const pricePaise = Math.round(Number(newItemPriceRupees) * 100);
      await authedRequest('/api/admin/menu/items', 'POST', {
        categoryId: newItemCategoryId,
        name: newItemName,
        description: newItemDescription,
        basePricePaise: pricePaise,
        imageUrl: '/src/assets/images/menu_irani_chai_1795358468520.jpg',
        dietaryTag: newItemDietary,
        isSignature: newItemSignature,
        isDraftSample: false,
        available: true,
      });
      setNewItemName('');
      setNewItemDescription('');
      setActionSuccess('New menu item added to live catalogue.');
      await Promise.all([loadPortalData(), refreshBootstrap()]);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Could not create item.');
    }
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchEdit) return;
    try {
      setActionError(null);
      await authedRequest(`/api/admin/branches/${branchEdit.id}`, 'PATCH', {
        name: branchEdit.name,
        addressLine: branchEdit.addressLine,
        city: branchEdit.city,
        phone: branchEdit.phone,
        email: branchEdit.email,
        openingHours: branchEdit.openingHours,
        mapUrl: branchEdit.mapUrl,
        totalSeats: Number(branchEdit.totalSeats),
        isVerified: true,
      });
      setActionSuccess('Branch details saved & verified.');
      await Promise.all([loadPortalData(), refreshBootstrap()]);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Branch update failed.');
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError(null);
      await authedRequest(`/api/admin/content/${editingContentKey}`, 'PATCH', {
        title: contentTitle,
        body: contentBody,
        isVerified: contentVerified,
      });
      setActionSuccess('Site copy updated.');
      await Promise.all([loadPortalData(), refreshBootstrap()]);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Content update failed.');
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionError(null);
      await authedRequest('/api/admin/offers', 'POST', {
        code: offerCode,
        title: offerTitle,
        description: `${offerPercent}% discount on orders above ₹${offerMinRupees}`,
        discountType: 'percent',
        discountValue: Number(offerPercent),
        minOrderPaise: Math.round(Number(offerMinRupees) * 100),
      });
      setOfferCode('');
      setOfferTitle('');
      setActionSuccess('Offer created.');
      await Promise.all([loadPortalData(), refreshBootstrap()]);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Offer creation failed.');
    }
  };

  const handleToggleOffer = async (offer: Offer) => {
    try {
      await authedRequest(`/api/admin/offers/${offer.id}`, 'PATCH', { active: !offer.active });
      await Promise.all([loadPortalData(), refreshBootstrap()]);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Offer toggle failed.');
    }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await authedRequest(`/api/admin/users/${userId}/role`, 'PATCH', { role });
      setActionSuccess('Team member role updated.');
      await loadPortalData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Role update failed.');
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-[#514B42]">
        Verifying session...
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20">
        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-8 sm:p-10 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#173E32] text-[#D5AE70] mx-auto flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-[#173E32]">
            Guest & Operations Portal
          </h1>
          <p className="text-sm text-[#514B42] leading-relaxed">
            Sign in with Google to view your personal order history and table reservations—or to
            access the Charminar Café Admin & Kitchen Operations Dashboard if your account has
            owner or staff permissions.
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full py-3.5 px-5 rounded-lg bg-[#173E32] text-[#F4EDDF] text-sm font-semibold hover:bg-[#215243] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-[#D5AE70]" />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  const filteredOrders = (adminData?.orders || []).filter((o) =>
    orderStatusFilter === 'all' ? true : o.status === orderStatusFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Identity Bar */}
      <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8C3E25]">
            Signed-In Session · Role: {dbUser?.role.replace('_', ' ').toUpperCase() || 'CUSTOMER'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[#173E32]">
            {dbUser?.displayName || firebaseUser.displayName || firebaseUser.email}
          </h1>
          <p className="text-xs text-[#706B62]">{firebaseUser.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadPortalData}
            disabled={loadingData}
            className="px-4 py-2 rounded-lg border border-[#30231C]/20 text-xs font-semibold text-[#173E32] hover:bg-[#F4EDDF] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-lg bg-[#173E32] text-[#F4EDDF] text-xs font-semibold hover:bg-[#215243] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-[#8C3E25]/12 border border-[#8C3E25]/35 text-sm text-[#8C3E25] font-medium">
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-[#173E32]/10 border border-[#173E32]/25 text-sm text-[#173E32] font-medium">
          {actionSuccess}
        </div>
      )}

      {/* Staff / Owner Business Operations Dashboard */}
      {isStaff && adminData && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#30231C]/12 pb-4">
            {(
              [
                { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
                { id: 'orders', label: `Order Queue (${adminData.orders.length})`, icon: ChefHat },
                {
                  id: 'reservations',
                  label: `Reservations (${adminData.reservations.length})`,
                  icon: CalendarCheck,
                },
                { id: 'menu', label: 'Menu & Offers', icon: UtensilsCrossed },
                { id: 'governance', label: 'Outlet, Copy & Roles', icon: Store },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    adminTab === tab.id
                      ? 'bg-[#173E32] text-[#F4EDDF]'
                      : 'bg-[#FFFDF8] text-[#30231C] border border-[#30231C]/15 hover:border-[#173E32]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: ANALYTICS */}
          {adminTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5">
                  <p className="text-xs text-[#706B62]">Gross Item Sales</p>
                  <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#173E32]">
                    {formatINR(adminData.analytics.grossItemSalesPaise)}
                  </p>
                  <p className="mt-1 text-xs text-[#514B42]">
                    Across {adminData.analytics.activeOrderCount} active orders
                  </p>
                </div>
                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5">
                  <p className="text-xs text-[#706B62]">Net Collected (Verified)</p>
                  <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#173E32]">
                    {formatINR(adminData.analytics.netCollectedPaise)}
                  </p>
                  <p className="mt-1 text-xs text-[#514B42]">
                    GST Collected: {formatINR(adminData.analytics.taxPaise)}
                  </p>
                </div>
                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5">
                  <p className="text-xs text-[#706B62]">Average Order Value</p>
                  <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#173E32]">
                    {formatINR(adminData.analytics.averageOrderValuePaise)}
                  </p>
                  <p className="mt-1 text-xs text-[#514B42]">
                    Discounts: {formatINR(adminData.analytics.discountsPaise)}
                  </p>
                </div>
                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5">
                  <p className="text-xs text-[#706B62]">Cancellations & Refunds</p>
                  <p className="mt-2 font-mono-tabular text-2xl font-bold text-[#8C3E25]">
                    {formatINR(adminData.analytics.refundsPaise)}
                  </p>
                  <p className="mt-1 text-xs text-[#514B42]">
                    {adminData.analytics.cancelledCount} cancelled orders
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-6">
                  <h2 className="font-display text-2xl font-semibold text-[#173E32]">
                    Top Selling Items
                  </h2>
                  {adminData.analytics.topItems.length === 0 ? (
                    <p className="mt-4 text-sm text-[#706B62]">
                      Place a test order from the Menu to populate item mix metrics.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#30231C]/12 text-left text-xs text-[#706B62]">
                            <th className="py-2">Item</th>
                            <th className="py-2 text-right">Qty</th>
                            <th className="py-2 text-right">Gross Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminData.analytics.topItems.map((it) => (
                            <tr key={it.name} className="border-b border-[#30231C]/8">
                              <td className="py-2.5 font-medium text-[#173E32]">{it.name}</td>
                              <td className="py-2.5 text-right font-mono-tabular">{it.quantity}</td>
                              <td className="py-2.5 text-right font-mono-tabular">
                                {formatINR(it.revenuePaise)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-6">
                  <h2 className="font-display text-2xl font-semibold text-[#173E32]">
                    Recent Audit Trail
                  </h2>
                  <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto">
                    {adminData.auditLogs.length === 0 ? (
                      <p className="text-sm text-[#706B62]">No administrative events recorded yet.</p>
                    ) : (
                      adminData.auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg bg-[#F4EDDF]/60 border border-[#30231C]/8 text-xs"
                        >
                          <p className="font-semibold text-[#173E32]">{log.summary}</p>
                          <p className="mt-0.5 text-[#706B62]">
                            {log.actorEmail} ({log.actorRole}) ·{' '}
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS */}
          {adminTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'pending_payment', 'placed', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'].map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                        orderStatusFilter === st
                          ? 'bg-[#8C3E25] text-[#F4EDDF]'
                          : 'bg-[#FFFDF8] text-[#30231C] border border-[#30231C]/15'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-8 bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 text-sm text-[#706B62]">
                  No orders in this queue.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-[#706B62]">
                            <span className="font-mono-tabular font-semibold text-[#173E32]">
                              {ord.orderNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{ord.fulfilmentType.replace('_', ' ')}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">
                              Payment: {ord.paymentStatus.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="mt-1 text-base font-semibold text-[#173E32]">
                            {ord.customerName} ({ord.customerPhone})
                          </h3>
                          {ord.deliveryAddress && (
                            <p className="text-xs text-[#514B42]">Address: {ord.deliveryAddress}</p>
                          )}
                          {ord.specialInstructions && (
                            <p className="text-xs text-[#8C3E25] mt-0.5">
                              Note: {ord.specialInstructions}
                            </p>
                          )}
                        </div>

                        <div className="text-left md:text-right">
                          <p className="font-mono-tabular text-lg font-bold text-[#173E32]">
                            {formatINR(ord.totalPaise)}
                          </p>
                          <p className="text-xs font-semibold capitalize text-[#8C3E25]">
                            Status: {ord.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      {ord.items && ord.items.length > 0 && (
                        <div className="p-3 rounded-lg bg-[#F4EDDF]/60 text-xs space-y-1">
                          {ord.items.map((line) => (
                            <div key={line.id} className="flex justify-between">
                              <span>
                                {line.quantity}× {line.itemNameSnapshot}
                                {line.modifiersSnapshot.length > 0 &&
                                  ` (${line.modifiersSnapshot
                                    .map((m) => m.optionLabel)
                                    .join(', ')})`}
                              </span>
                              <span className="font-mono-tabular">
                                {formatINR(line.lineTotalPaise)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {(['accepted', 'preparing', 'ready', 'completed'] as const).map((next) => (
                          <button
                            key={next}
                            type="button"
                            onClick={() => handleOrderStatus(ord.id, next)}
                            className="px-3 py-1.5 rounded-lg bg-[#173E32] text-[#F4EDDF] text-xs font-semibold capitalize hover:bg-[#215243] cursor-pointer"
                          >
                            Mark {next}
                          </button>
                        ))}
                        {(dbUser?.role === 'owner' || dbUser?.role === 'manager') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOrderStatus(ord.id, 'cancelled')}
                              className="px-3 py-1.5 rounded-lg border border-[#8C3E25] text-[#8C3E25] text-xs font-semibold hover:bg-[#8C3E25]/10 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOrderStatus(ord.id, 'refunded')}
                              className="px-3 py-1.5 rounded-lg border border-[#30231C]/30 text-[#30231C] text-xs font-semibold hover:bg-[#F4EDDF] cursor-pointer"
                            >
                              Refund
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESERVATIONS */}
          {adminTab === 'reservations' && (
            <div className="space-y-4">
              {adminData.reservations.length === 0 ? (
                <div className="p-8 bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 text-sm text-[#706B62]">
                  No table reservations yet.
                </div>
              ) : (
                adminData.reservations.map((r) => (
                  <div
                    key={r.id}
                    className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs font-mono-tabular font-semibold text-[#8C3E25]">
                        {r.reservationCode} · Status: {r.status.toUpperCase()}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-[#173E32]">
                        {r.guestName} · {r.partySize} Guests ({r.seatingPreference})
                      </h3>
                      <p className="text-xs text-[#514B42]">
                        {r.reservationDate} at {r.timeSlot} · {r.guestPhone}
                      </p>
                      {r.notes && <p className="text-xs text-[#706B62] mt-1">Note: {r.notes}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(['confirmed', 'completed', 'declined', 'no_show'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleReservationStatus(r.id, st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                            st === 'confirmed' || st === 'completed'
                              ? 'bg-[#173E32] text-[#F4EDDF] hover:bg-[#215243]'
                              : 'border border-[#8C3E25]/40 text-[#8C3E25] hover:bg-[#8C3E25]/10'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: MENU & OFFERS */}
          {adminTab === 'menu' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="font-display text-2xl font-semibold text-[#173E32]">
                  Live Menu Catalogue
                </h2>
                {adminData.menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-12 rounded-lg object-cover shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-sm text-[#173E32]">{item.name}</p>
                        <p className="text-xs text-[#706B62] font-mono-tabular">
                          {formatINR(item.basePricePaise)} · {item.dietaryTag} ·{' '}
                          {item.isDraftSample ? 'Draft Preview' : 'Owner Approved'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isDraftSample && (
                        <button
                          type="button"
                          onClick={() => handleApproveDraftItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-[#D5AE70] text-[#173E32] text-xs font-semibold cursor-pointer"
                        >
                          Publish Approved
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleItemAvailability(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          item.available
                            ? 'bg-[#173E32] text-[#F4EDDF]'
                            : 'bg-[#8C3E25] text-[#F4EDDF]'
                        }`}
                      >
                        {item.available ? 'In Stock' : 'Sold Out'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                {/* Add Menu Item */}
                <form
                  onSubmit={handleCreateMenuItem}
                  className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5 space-y-3"
                >
                  <h3 className="font-display text-xl font-semibold text-[#173E32] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#8C3E25]" />
                    Add Menu Item
                  </h3>
                  <select
                    value={newItemCategoryId}
                    onChange={(e) => setNewItemCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                  >
                    {adminData.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Dish name"
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      required
                      min="10"
                      value={newItemPriceRupees}
                      onChange={(e) => setNewItemPriceRupees(e.target.value)}
                      placeholder="Price (INR)"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm font-mono-tabular"
                    />
                    <input
                      type="text"
                      value={newItemDietary}
                      onChange={(e) => setNewItemDietary(e.target.value)}
                      placeholder="Vegetarian"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                    />
                  </div>
                  <textarea
                    required
                    rows={2}
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Short culinary description..."
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                  />
                  <label className="flex items-center gap-2 text-xs text-[#514B42]">
                    <input
                      type="checkbox"
                      checked={newItemSignature}
                      onChange={(e) => setNewItemSignature(e.target.checked)}
                    />
                    Feature on Home Signature Showcase
                  </label>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#173E32] text-[#F4EDDF] text-xs font-semibold hover:bg-[#215243] cursor-pointer"
                  >
                    Publish Menu Item
                  </button>
                </form>

                {/* Offers Management */}
                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-5 space-y-4">
                  <h3 className="font-display text-xl font-semibold text-[#173E32]">
                    Promotional Offers
                  </h3>
                  <div className="space-y-2">
                    {adminData.offers.map((off) => (
                      <div
                        key={off.id}
                        className="p-3 rounded-lg bg-[#F4EDDF]/70 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-mono-tabular font-semibold text-[#173E32]">
                            {off.code} ({off.discountValue}%)
                          </p>
                          <p className="text-[#514B42]">{off.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleOffer(off)}
                          className="px-2.5 py-1 rounded bg-[#173E32] text-[#F4EDDF] font-semibold cursor-pointer"
                        >
                          {off.active ? 'Active' : 'Paused'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleCreateOffer} className="space-y-2 pt-2 border-t border-[#30231C]/10">
                    <input
                      type="text"
                      required
                      value={offerCode}
                      onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                      placeholder="New code (e.g. CHAI15)"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-xs font-mono-tabular"
                    />
                    <input
                      type="text"
                      required
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      placeholder="Offer headline"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        required
                        min="1"
                        max="80"
                        value={offerPercent}
                        onChange={(e) => setOfferPercent(e.target.value)}
                        placeholder="% Off"
                        className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-xs font-mono-tabular"
                      />
                      <input
                        type="number"
                        required
                        min="0"
                        value={offerMinRupees}
                        onChange={(e) => setOfferMinRupees(e.target.value)}
                        placeholder="Min ₹"
                        className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-xs font-mono-tabular"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg bg-[#8C3E25] text-[#F4EDDF] text-xs font-semibold cursor-pointer"
                    >
                      Create Offer
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GOVERNANCE, BRANCHES, SITE COPY & ROLES */}
          {adminTab === 'governance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {branchEdit && (
                <form
                  onSubmit={handleSaveBranch}
                  className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-6 space-y-3"
                >
                  <h2 className="font-display text-2xl font-semibold text-[#173E32]">
                    Verify Outlet Location & Hours
                  </h2>
                  <input
                    type="text"
                    required
                    value={branchEdit.name}
                    onChange={(e) => setBranchEdit({ ...branchEdit, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                  />
                  <input
                    type="text"
                    required
                    value={branchEdit.addressLine}
                    onChange={(e) =>
                      setBranchEdit({ ...branchEdit, addressLine: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={branchEdit.phone}
                      onChange={(e) => setBranchEdit({ ...branchEdit, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                    />
                    <input
                      type="number"
                      required
                      value={branchEdit.totalSeats}
                      onChange={(e) =>
                        setBranchEdit({ ...branchEdit, totalSeats: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm font-mono-tabular"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={branchEdit.openingHours}
                    onChange={(e) =>
                      setBranchEdit({ ...branchEdit, openingHours: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#173E32] text-[#F4EDDF] text-xs font-semibold hover:bg-[#215243] cursor-pointer"
                  >
                    Save & Mark Branch Verified
                  </button>
                </form>
              )}

              <form
                onSubmit={handleSaveContent}
                className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-6 space-y-3"
              >
                <h2 className="font-display text-2xl font-semibold text-[#173E32]">
                  Edit Story & Legal Policy Copy
                </h2>
                <select
                  value={editingContentKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setEditingContentKey(key);
                    const found = adminData.content.find((c) => c.key === key);
                    if (found) {
                      setContentTitle(found.title);
                      setContentBody(found.body);
                      setContentVerified(found.isVerified);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                >
                  {adminData.content.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.key} ({c.isVerified ? 'Verified' : 'Draft'})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={contentTitle}
                  onChange={(e) => setContentTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                />
                <textarea
                  rows={4}
                  required
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 text-sm"
                />
                <label className="flex items-center gap-2 text-xs text-[#514B42]">
                  <input
                    type="checkbox"
                    checked={contentVerified}
                    onChange={(e) => setContentVerified(e.target.checked)}
                  />
                  Mark as Owner-Verified Public Copy
                </label>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#8C3E25] text-[#F4EDDF] text-xs font-semibold hover:bg-[#A14A2E] cursor-pointer"
                >
                  Save Copy Changes
                </button>
              </form>

              {dbUser?.role === 'owner' && (
                <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-6 space-y-3 lg:col-span-2">
                  <h2 className="font-display text-2xl font-semibold text-[#173E32]">
                    Team Access & Roles (Owner Control)
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#30231C]/12 text-left text-xs text-[#706B62]">
                          <th className="py-2">Email</th>
                          <th className="py-2">Name</th>
                          <th className="py-2">Assigned Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminData.users.map((u) => (
                          <tr key={u.id} className="border-b border-[#30231C]/8">
                            <td className="py-2.5 font-medium text-[#173E32]">{u.email}</td>
                            <td className="py-2.5 text-[#514B42]">{u.displayName || '—'}</td>
                            <td className="py-2.5">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="px-2.5 py-1 rounded border border-[#30231C]/20 text-xs bg-[#FFFDF8]"
                              >
                                <option value="owner">Owner / Super Admin</option>
                                <option value="manager">Manager</option>
                                <option value="order_staff">Order Staff</option>
                                <option value="content_editor">Content Editor</option>
                                <option value="customer">Customer</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Guest Inquiries */}
              <div className="bg-[#FFFDF8] rounded-xl border border-[#30231C]/12 p-6 space-y-3 lg:col-span-2">
                <h2 className="font-display text-2xl font-semibold text-[#173E32]">
                  Guest Inquiries ({adminData.inquiries.length})
                </h2>
                {adminData.inquiries.length === 0 ? (
                  <p className="text-sm text-[#706B62]">No contact form messages received yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {adminData.inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="p-4 rounded-lg bg-[#F4EDDF]/60 border border-[#30231C]/10 text-xs"
                      >
                        <p className="font-semibold text-[#173E32]">
                          {inq.subject} — {inq.name} ({inq.email})
                        </p>
                        <p className="mt-1 text-[#514B42]">{inq.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personal Customer History (shown to all signed-in users) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#173E32]">My Orders</h2>
          {myOrders.length === 0 ? (
            <p className="text-sm text-[#706B62]">You haven’t placed any signed-in orders yet.</p>
          ) : (
            <div className="space-y-3">
              {myOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl bg-[#F4EDDF]/60 border border-[#30231C]/10 text-xs space-y-1"
                >
                  <div className="flex justify-between font-semibold text-[#173E32]">
                    <span className="font-mono-tabular">{ord.orderNumber}</span>
                    <span className="font-mono-tabular">{formatINR(ord.totalPaise)}</span>
                  </div>
                  <p className="capitalize text-[#8C3E25]">
                    Status: {ord.status.replace('_', ' ')} · {ord.fulfilmentType}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#173E32]">My Reservations</h2>
          {myReservations.length === 0 ? (
            <p className="text-sm text-[#706B62]">No personal table reservations found.</p>
          ) : (
            <div className="space-y-3">
              {myReservations.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-xl bg-[#F4EDDF]/60 border border-[#30231C]/10 text-xs space-y-1"
                >
                  <div className="flex justify-between font-semibold text-[#173E32]">
                    <span className="font-mono-tabular">{res.reservationCode}</span>
                    <span className="capitalize text-[#8C3E25]">{res.status}</span>
                  </div>
                  <p className="text-[#514B42]">
                    {res.reservationDate} at {res.timeSlot} · {res.partySize} Guests ({res.seatingPreference})
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
