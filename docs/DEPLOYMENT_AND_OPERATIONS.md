# Charminar Café — Deployment, Operations & Testing Runbook

## 1. Architecture Summary

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Three.js (`RoomEnvironment`, procedural PBR architectural pavilion, `OrbitControls`, raycast hotspots, and 2D fallback).
- **Backend:** Express.js (`server.ts`) serving Vite middleware in development, static production bundle in production, and validated `/api/*` business endpoints.
- **Database:** Cloud SQL for PostgreSQL managed via Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`).
- **Authentication & RBAC:** Firebase Authentication (Google Sign-In via `signInWithPopup`) verified server-side with `firebase-admin` (`src/middleware/auth.ts`). Roles supported: `owner`, `manager`, `order_staff`, `content_editor`, `customer`.

---

## 2. Environment Variables

Ensure runtime environment variables are provisioned securely (never commit real values to Git):
- `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD` (runtime pool)
- `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD` (Drizzle schema updates)
- `OWNER_EMAIL` (optional override for initial owner assignment; defaults to `kundurthy08@gmail.com`)
- `PORT` (defaults to `3000`)

---

## 3. Financial & Concurrency Safeguards

1. **Money Precision:** All prices, discounts, GST taxes, and totals are stored and computed in integer minor units (**paise**) using `Math.round`—no floating-point currency math.
2. **Order Idempotency:** Each checkout submission supplies a client-generated `idempotencyKey` enforced by a PostgreSQL unique constraint on `orders.idempotency_key`.
3. **Server-Side Price & Availability Validation:** `createServerValidatedOrder` fetches live item prices, modifier deltas, and offer rules inside a database transaction. Client-supplied prices are ignored.
4. **Reservation Concurrency:** `createAtomicReservation` locks the branch record (`SELECT ... FOR UPDATE`) inside a PostgreSQL transaction before summing active party sizes for the requested `reservation_date` and `time_slot`.
5. **Audit Trail:** All administrative status changes, menu mutations, offer toggles, branch updates, and role assignments write an entry to `audit_logs`.

---

## 4. Production Release Checklist

- [ ] Replace all `isDraftSample` menu items with owner-verified dishes, pricing, and GST rates via **Portal → Menu & Offers**.
- [ ] Verify outlet address, phone, opening hours, and map coordinates via **Portal → Outlet, Copy & Roles**.
- [ ] Approve or customize brand story and legal policies (`policy_terms`, `policy_privacy`, `policy_refund`).
- [ ] Connect production Razorpay / payment gateway merchant keys and webhook verification before disabling sandbox mode.
- [ ] Verify automated Cloud SQL backups and test point-in-time recovery.
- [ ] Confirm custom domain HTTPS and run `npm run lint` + `npm run build` before rollout.
