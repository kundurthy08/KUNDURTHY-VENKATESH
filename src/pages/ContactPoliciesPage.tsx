import React, { useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, Mail, MapPin, Phone, Search } from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import { formatINR, type OrderRecord } from '../types';

export const ContactPage: React.FC = () => {
  const { branches } = useCafe();
  const branch = branches[0];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<OrderRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleOrderLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupCode.trim();
    if (!trimmed) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/public/orders/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order not found');
      setLookupResult(data.order);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : 'Unable to locate order');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send message.');
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8C3E25]">
          Location & Hospitality Desk
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-[#173E32]">
          Visit & Contact Us
        </h1>
        <p className="mt-3 text-base text-[#514B42]">
          Reach out for private gatherings, catering requests, feedback, or check your order status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
          <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-8 space-y-6">
            <h2 className="font-display text-3xl font-semibold text-[#173E32]">
              {branch?.name || 'Charminar Café'}
            </h2>
            {branch && (
              <div className="space-y-4 text-sm text-[#514B42]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#8C3E25] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#173E32]">Address</p>
                    <p>{branch.addressLine}</p>
                    <p>{branch.city}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#8C3E25] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#173E32]">Opening Hours</p>
                    <p>{branch.openingHours}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#8C3E25] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#173E32]">Telephone</p>
                    <p className="font-mono-tabular">{branch.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#8C3E25] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#173E32]">Email</p>
                    <p>{branch.email}</p>
                  </div>
                </div>

                {!branch.isVerified && (
                  <div className="p-3.5 rounded-xl bg-[#FFF8E9] border border-[#D5AE70] text-xs text-[#30231C]">
                    Notice: These branch details are placeholders until verified by the café owner in
                    the Admin Portal.
                  </div>
                )}

                <a
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#173E32] text-[#F4EDDF] text-sm font-semibold hover:bg-[#215243] transition-colors"
                >
                  Open Directions
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-8 space-y-4">
            <h2 className="font-display text-2xl font-semibold text-[#173E32]">
              Track Your Order
            </h2>
            <p className="text-sm text-[#514B42]">
              Enter your Charminar Café order number (e.g. CC-123456-AB12) for live preparation
              status.
            </p>
            <form onSubmit={handleOrderLookup} className="flex gap-2">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                placeholder="CC-..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#F4EDDF]/40 text-sm font-mono-tabular focus:outline-none focus:border-[#173E32]"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="px-4 py-2 rounded-lg bg-[#173E32] text-[#F4EDDF] text-sm font-semibold hover:bg-[#215243] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                Check
              </button>
            </form>
            {lookupError && <p className="text-xs text-[#8C3E25] font-medium">{lookupError}</p>}
            {lookupResult && (
              <div className="p-4 rounded-xl bg-[#F4EDDF] border border-[#173E32]/20 text-xs space-y-1">
                <p className="font-mono-tabular font-semibold text-[#173E32]">
                  {lookupResult.orderNumber}
                </p>
                <p className="text-[#30231C]">
                  Status:{' '}
                  <span className="font-semibold capitalize">
                    {lookupResult.status.replace('_', ' ')}
                  </span>
                </p>
                <p className="text-[#514B42]">
                  Total: <span className="font-mono-tabular">{formatINR(lookupResult.totalPaise)}</span> ·{' '}
                  {lookupResult.fulfilmentType}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-8">
          <h2 className="font-display text-3xl font-semibold text-[#173E32]">Send an Inquiry</h2>
          {sent ? (
            <div className="mt-6 p-5 rounded-xl bg-[#F4EDDF] border border-[#173E32]/20 space-y-3">
              <div className="flex items-center gap-2 text-[#173E32] font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Message Received</span>
              </div>
              <p className="text-sm text-[#514B42]">
                Thank you for contacting Charminar Café. Our hospitality team can review your note
                directly in the Portal.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-xs font-semibold text-[#8C3E25] hover:underline cursor-pointer"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Private event, feedback, catering..."
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#514B42] mb-1">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                />
              </div>
              {errorMsg && <p className="text-xs text-[#8C3E25]">{errorMsg}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-[#8C3E25] text-[#F4EDDF] text-sm font-semibold hover:bg-[#A14A2E] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Sending...' : 'Submit Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const PoliciesPage: React.FC = () => {
  const { contentBlocks } = useCafe();
  const policies = contentBlocks.filter((c) => c.key.startsWith('policy_'));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8C3E25]">
          Governance & Guest Policies
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-[#173E32]">
          Privacy, Terms & Refund Policies
        </h1>
      </div>

      <div className="space-y-6">
        {policies.map((pol) => (
          <section
            key={pol.key}
            className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-7 space-y-2.5"
          >
            <h2 className="font-display text-2xl font-semibold text-[#173E32]">{pol.title}</h2>
            <p className="text-sm text-[#514B42] leading-relaxed">{pol.body}</p>
            {!pol.isVerified && (
              <p className="text-xs text-[#8C3E25]">
                Draft legal template — editable and approvable by the café owner in the Portal.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};
