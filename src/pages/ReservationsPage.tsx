import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Search, Users } from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import type { ReservationRecord } from '../types';

const TIME_SLOTS = ['09:00', '11:30', '14:00', '17:00', '19:30', '21:15'];
const SEATING_AREAS = [
  'Heritage Arch Alcove',
  'Jaali Window Table',
  'Chai Counter Bar',
  'Courtyard Lounge',
];

function getTomorrowIso(): string {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().split('T')[0];
}

export const ReservationsPage: React.FC = () => {
  const { branches, firebaseUser, getIdToken } = useCafe();
  const branchId = branches[0]?.id || 1;

  const [reservationDate, setReservationDate] = useState(getTomorrowIso);
  const [timeSlot, setTimeSlot] = useState('17:00');
  const [partySize, setPartySize] = useState(2);
  const [seatingPreference, setSeatingPreference] = useState(SEATING_AREAS[0]);
  const [guestName, setGuestName] = useState(firebaseUser?.displayName || '');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState(firebaseUser?.email || '');
  const [notes, setNotes] = useState('');

  const [remainingSeats, setRemainingSeats] = useState<number | null>(null);
  const [totalSeats, setTotalSeats] = useState<number | null>(null);
  const [checkingSlot, setCheckingSlot] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedRes, setConfirmedRes] = useState<ReservationRecord | null>(null);

  const [lookupCode, setLookupCode] = useState('');
  const [lookupRes, setLookupRes] = useState<ReservationRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      setCheckingSlot(true);
      try {
        const res = await fetch(
          `/api/public/reservations/availability?branchId=${branchId}&date=${encodeURIComponent(
            reservationDate
          )}&timeSlot=${encodeURIComponent(timeSlot)}`
        );
        const data = await res.json();
        if (active && res.ok) {
          setRemainingSeats(data.remainingSeats);
          setTotalSeats(data.totalSeats);
        }
      } catch {
        // ignore background check failure
      } finally {
        if (active) setCheckingSlot(false);
      }
    };
    check();
    return () => {
      active = false;
    };
  }, [branchId, reservationDate, timeSlot, confirmedRes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/public/reservations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          branchId,
          guestName: guestName || firebaseUser?.displayName || 'Guest',
          guestPhone,
          guestEmail: guestEmail || firebaseUser?.email || '',
          reservationDate,
          timeSlot,
          partySize,
          seatingPreference,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not complete reservation.');
      setConfirmedRes(data.reservation);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Reservation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setLookupError(null);
    setLookupRes(null);
    try {
      const res = await fetch(`/api/public/reservations/${encodeURIComponent(lookupCode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reservation not found.');
      setLookupRes(data.reservation);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8C3E25]">
          Table Booking
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-[#173E32]">
          Reserve Your Alcove
        </h1>
        <p className="mt-3 text-base text-[#514B42]">
          Real-time seating capacity checked atomically against our floor plan before every
          booking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-6 sm:p-8">
          {confirmedRes ? (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-[#173E32] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8C3E25]">
                    Reservation Request Recorded
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-[#173E32] mt-1">
                    Code: {confirmedRes.reservationCode}
                  </h2>
                  <p className="mt-2 text-sm text-[#514B42]">
                    {confirmedRes.guestName} · Party of {confirmedRes.partySize} ·{' '}
                    {confirmedRes.reservationDate} at {confirmedRes.timeSlot}
                  </p>
                  <p className="mt-1 text-sm text-[#514B42]">
                    Seating: {confirmedRes.seatingPreference} · Status:{' '}
                    <span className="font-semibold capitalize">{confirmedRes.status}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmedRes(null)}
                className="px-5 py-2.5 rounded-lg bg-[#173E32] text-[#F4EDDF] text-sm font-semibold hover:bg-[#215243] cursor-pointer"
              >
                Make Another Reservation
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#173E32] mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#8C3E25]" />
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={reservationDate}
                    onChange={(e) => setReservationDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#F4EDDF]/35 text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#173E32] mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#8C3E25]" />
                    Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#F4EDDF]/35 text-sm focus:outline-none focus:border-[#173E32]"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#173E32] mb-1.5">
                    <Users className="w-3.5 h-3.5 text-[#8C3E25]" />
                    Party Size
                  </label>
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#F4EDDF]/35 text-sm focus:outline-none focus:border-[#173E32]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Capacity Banner */}
              <div className="p-3.5 rounded-xl bg-[#F4EDDF] border border-[#30231C]/12 flex items-center justify-between text-xs">
                <span className="font-medium text-[#30231C]">
                  {checkingSlot
                    ? 'Checking live floor capacity...'
                    : remainingSeats !== null
                    ? `${remainingSeats} of ${totalSeats} seats available for ${timeSlot} on ${reservationDate}`
                    : 'Live floor capacity verified on submit'}
                </span>
                {remainingSeats !== null && remainingSeats < partySize && (
                  <span className="font-semibold text-[#8C3E25]">Insufficient capacity</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#173E32] mb-2">
                  Seating Zone Preference
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SEATING_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSeatingPreference(area)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                        seatingPreference === area
                          ? 'bg-[#173E32] text-[#F4EDDF] border-[#173E32]'
                          : 'bg-[#FFFDF8] text-[#30231C] border-[#30231C]/15 hover:border-[#173E32]'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Meera Rao"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#514B42] mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#514B42] mb-1">
                  Special Occasion or Accessibility Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Quiet alcove seating, high chair needed, etc."
                  className="w-full px-3 py-2.5 rounded-lg border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-[#8C3E25]/12 border border-[#8C3E25]/35 text-xs text-[#8C3E25] font-medium">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting || (remainingSeats !== null && remainingSeats < partySize)
                }
                className="w-full py-3.5 rounded-lg bg-[#8C3E25] text-[#F4EDDF] text-sm font-semibold hover:bg-[#A14A2E] transition-colors disabled:opacity-45 cursor-pointer"
              >
                {submitting ? 'Confirming Capacity...' : 'Submit Table Reservation'}
              </button>
            </form>
          )}
        </div>

        {/* Lookup Card */}
        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#173E32]">
            Check Existing Booking
          </h2>
          <p className="text-xs text-[#514B42]">
            Enter your reservation code (e.g. RES-A1B2C3) to view current confirmation status.
          </p>
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
              placeholder="RES-..."
              className="flex-1 px-3 py-2 rounded-lg border border-[#30231C]/20 bg-[#F4EDDF]/40 text-sm font-mono-tabular focus:outline-none focus:border-[#173E32]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#173E32] text-[#F4EDDF] text-sm font-semibold hover:bg-[#215243] inline-flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              Find
            </button>
          </form>

          {lookupError && <p className="text-xs text-[#8C3E25]">{lookupError}</p>}
          {lookupRes && (
            <div className="p-4 rounded-xl bg-[#F4EDDF] border border-[#173E32]/20 text-xs space-y-1">
              <p className="font-mono-tabular font-semibold text-[#173E32]">
                {lookupRes.reservationCode}
              </p>
              <p className="text-[#30231C]">
                {lookupRes.guestName} · {lookupRes.partySize} Guests
              </p>
              <p className="text-[#514B42]">
                {lookupRes.reservationDate} at {lookupRes.timeSlot}
              </p>
              <p className="font-semibold capitalize text-[#173E32]">
                Status: {lookupRes.status.replace('_', ' ')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
