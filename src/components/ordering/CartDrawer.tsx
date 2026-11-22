import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import { useCafe } from '../../context/CafeContext';
import { formatINR, type OrderRecord } from '../../types';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotalPaise,
    branches,
    offers,
    firebaseUser,
    getIdToken,
  } = useCafe();

  const [customerName, setCustomerName] = useState(firebaseUser?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(firebaseUser?.email || '');
  const [fulfilmentType, setFulfilmentType] = useState<'pickup' | 'dine_in' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'pay_at_counter' | 'sandbox_upi' | 'sandbox_card'
  >('pay_at_counter');
  const [offerCode, setOfferCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const matchedOffer = useMemo(() => {
    const code = offerCode.trim().toUpperCase();
    if (!code) return null;
    return offers.find((o) => o.code === code && o.active) || null;
  }, [offerCode, offers]);

  const estimatedDiscount = useMemo(() => {
    if (!matchedOffer || cartSubtotalPaise < matchedOffer.minOrderPaise) return 0;
    if (matchedOffer.discountType === 'percent') {
      return Math.round((cartSubtotalPaise * matchedOffer.discountValue) / 100);
    }
    return Math.min(matchedOffer.discountValue, cartSubtotalPaise);
  }, [matchedOffer, cartSubtotalPaise]);

  const estimatedTax = Math.round(Math.max(0, cartSubtotalPaise - estimatedDiscount) * 0.05);
  const estimatedDeliveryFee = fulfilmentType === 'delivery' && cart.length > 0 ? 4000 : 0;
  const estimatedTotal = Math.max(0, cartSubtotalPaise - estimatedDiscount) + estimatedTax + estimatedDeliveryFee;

  if (!cartOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idempotencyKey,
          branchId: branches[0]?.id || 1,
          customerName: customerName || firebaseUser?.displayName || 'Guest',
          customerPhone,
          customerEmail: customerEmail || firebaseUser?.email || '',
          fulfilmentType,
          deliveryAddress: fulfilmentType === 'delivery' ? deliveryAddress : undefined,
          paymentMethod,
          offerCode: offerCode.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            selectedOptionIds: c.selectedOptionIds,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit order.');
      }

      setPlacedOrder(data.order);
      clearCart();
      setIdempotencyKey(
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSandboxPay = async (outcome: 'success' | 'fail') => {
    if (!placedOrder) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/public/orders/${placedOrder.orderNumber}/sandbox-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment verification failed');
      setPlacedOrder(data.order);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Sandbox payment error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setPlacedOrder(null);
    setErrorMsg(null);
    setCartOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#102B22]/55">
      <div
        className="w-full max-w-lg bg-[#FFFDF8] h-full flex flex-col border-l border-[#30231C]/15 shadow-2xl"
        role="dialog"
        aria-label="Order Bag and Checkout"
      >
        <div className="px-6 py-4 bg-[#173E32] text-[#F4EDDF] flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#D5AE70]">Your Order Bag</h2>
            <p className="text-xs text-[#F4EDDF]/80">
              Server-verified totals · {branches[0]?.name || 'Charminar Café'}
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-2 rounded-lg text-[#F4EDDF] hover:bg-[#F4EDDF]/10 transition-colors cursor-pointer"
            aria-label="Close order bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {placedOrder ? (
            <div className="space-y-5">
              <div className="p-5 rounded-xl bg-[#F4EDDF] border border-[#173E32]/20">
                <div className="flex items-start gap-3">
                  {placedOrder.status === 'payment_failed' ? (
                    <AlertCircle className="w-6 h-6 text-[#8C3E25] shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-[#173E32] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#8C3E25]">
                      {placedOrder.status === 'pending_payment'
                        ? 'Awaiting Sandbox Payment Verification'
                        : placedOrder.status === 'payment_failed'
                        ? 'Payment Failed'
                        : 'Order Confirmed'}
                    </p>
                    <h3 className="font-display text-2xl font-bold text-[#173E32] mt-0.5">
                      Order {placedOrder.orderNumber}
                    </h3>
                    <p className="text-sm text-[#514B42] mt-1">
                      Status: <span className="font-semibold capitalize">{placedOrder.status.replace('_', ' ')}</span> ·
                      Payment: <span className="font-semibold capitalize">{placedOrder.paymentStatus.replace('_', ' ')}</span>
                    </p>
                    {placedOrder.paymentReference && (
                      <p className="text-xs font-mono-tabular text-[#706B62] mt-1">
                        Ref: {placedOrder.paymentReference}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#30231C]/12 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#514B42]">Subtotal</span>
                    <span className="font-mono-tabular">{formatINR(placedOrder.subtotalPaise)}</span>
                  </div>
                  {placedOrder.discountPaise > 0 && (
                    <div className="flex justify-between text-[#173E32]">
                      <span>Offer ({placedOrder.offerCode})</span>
                      <span className="font-mono-tabular">-{formatINR(placedOrder.discountPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#514B42]">GST (5%)</span>
                    <span className="font-mono-tabular">{formatINR(placedOrder.taxPaise)}</span>
                  </div>
                  {placedOrder.deliveryFeePaise > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#514B42]">Delivery Fee</span>
                      <span className="font-mono-tabular">{formatINR(placedOrder.deliveryFeePaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#173E32] pt-2 border-t border-[#30231C]/12">
                    <span>Verified Total</span>
                    <span className="font-mono-tabular">{formatINR(placedOrder.totalPaise)}</span>
                  </div>
                </div>
              </div>

              {(placedOrder.status === 'pending_payment' ||
                placedOrder.status === 'payment_failed') && (
                <div className="p-5 rounded-xl bg-[#FFF8E9] border border-[#D5AE70] space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#173E32]">
                    <CreditCard className="w-4 h-4 text-[#8C3E25]" />
                    <span>Sandbox Payment Gateway Simulation</span>
                  </div>
                  <p className="text-xs text-[#514B42] leading-relaxed">
                    No live merchant keys are connected yet. Test the server-side payment
                    confirmation webhook flow below:
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxPay('success')}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-[#173E32] text-[#F4EDDF] text-xs font-semibold hover:bg-[#215243] disabled:opacity-50 cursor-pointer"
                    >
                      Verify Sandbox Payment
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSandboxPay('fail')}
                      className="py-2.5 px-4 rounded-lg border border-[#8C3E25] text-[#8C3E25] text-xs font-semibold hover:bg-[#8C3E25]/10 disabled:opacity-50 cursor-pointer"
                    >
                      Simulate Failure
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={resetAndClose}
                className="w-full py-3 rounded-lg bg-[#173E32] text-[#F4EDDF] text-sm font-semibold hover:bg-[#215243] cursor-pointer"
              >
                Done & Continue Exploring
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="font-display text-2xl text-[#173E32]">Your bag is empty</p>
              <p className="text-sm text-[#706B62]">
                Add Irani chai, bun maska, or spiced Deccani plates from our menu.
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.cartKey}
                    className="p-4 rounded-xl bg-[#F4EDDF]/65 border border-[#30231C]/10 flex gap-3.5"
                  >
                    <img
                      src={item.menuItem.imageUrl}
                      alt={item.menuItem.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#173E32] truncate">
                          {item.menuItem.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartKey)}
                          className="text-[#706B62] hover:text-[#8C3E25] p-1 cursor-pointer"
                          aria-label={`Remove ${item.menuItem.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {item.selectedOptionLabels.length > 0 && (
                        <p className="text-xs text-[#706B62] mt-0.5">
                          {item.selectedOptionLabels.join(' · ')}
                        </p>
                      )}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center border border-[#30231C]/20 rounded-lg bg-[#FFFDF8]">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.cartKey, item.quantity - 1)}
                            className="p-1.5 text-[#30231C] hover:bg-[#F4EDDF] cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-mono-tabular font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.cartKey, item.quantity + 1)}
                            className="p-1.5 text-[#30231C] hover:bg-[#F4EDDF] cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-mono-tabular font-semibold text-[#173E32]">
                          {formatINR(item.unitPricePaise * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleCheckout} className="space-y-4 pt-2 border-t border-[#30231C]/12">
                <h3 className="font-display text-xl font-semibold text-[#173E32]">
                  Fulfilment & Guest Details
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'pickup', label: 'Counter Pickup' },
                      { id: 'dine_in', label: 'Dine-In' },
                      { id: 'delivery', label: 'Local Delivery' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setFulfilmentType(mode.id)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        fulfilmentType === mode.id
                          ? 'bg-[#173E32] text-[#F4EDDF] border-[#173E32]'
                          : 'bg-[#FFFDF8] text-[#30231C] border-[#30231C]/20 hover:border-[#173E32]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#514B42] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Aarav Sharma"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#514B42] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">
                    Email (optional receipt copy)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>

                {fulfilmentType === 'delivery' && (
                  <div>
                    <label className="block text-xs font-medium text-[#514B42] mb-1">
                      Delivery Address *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House/Flat No., Street, Landmark, Hyderabad"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#514B42] mb-1">
                      Offer Code (Try DECCAN10)
                    </label>
                    <input
                      type="text"
                      value={offerCode}
                      onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                      placeholder="DECCAN10"
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm font-mono-tabular focus:outline-none focus:border-[#173E32]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#514B42] mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(
                          e.target.value as 'pay_at_counter' | 'sandbox_upi' | 'sandbox_card'
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                    >
                      <option value="pay_at_counter">Pay at Café Counter</option>
                      <option value="sandbox_upi">Online UPI (Sandbox Test)</option>
                      <option value="sandbox_card">Online Card (Sandbox Test)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">
                    Kitchen Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Extra hot chai, pack biscuits separately..."
                    className="w-full px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>

                {/* Totals Preview */}
                <div className="p-4 rounded-xl bg-[#F4EDDF] border border-[#30231C]/12 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#514B42]">Items Subtotal</span>
                    <span className="font-mono-tabular">{formatINR(cartSubtotalPaise)}</span>
                  </div>
                  {estimatedDiscount > 0 && (
                    <div className="flex justify-between text-[#173E32]">
                      <span>Offer Discount ({matchedOffer?.code})</span>
                      <span className="font-mono-tabular">-{formatINR(estimatedDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#514B42]">Estimated GST (5%)</span>
                    <span className="font-mono-tabular">{formatINR(estimatedTax)}</span>
                  </div>
                  {estimatedDeliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#514B42]">Delivery Charge</span>
                      <span className="font-mono-tabular">{formatINR(estimatedDeliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#173E32] pt-2 border-t border-[#30231C]/12">
                    <span>Estimated Total</span>
                    <span className="font-mono-tabular">{formatINR(estimatedTotal)}</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-[#8C3E25]/12 border border-[#8C3E25]/35 text-xs text-[#8C3E25] font-medium">
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-lg bg-[#8C3E25] text-[#F4EDDF] text-sm font-semibold hover:bg-[#A14A2E] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitting ? 'Validating on Server...' : 'Place Verified Order'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
