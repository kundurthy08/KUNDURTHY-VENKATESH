# Charminar-Caf-

**Charminar Café** — Contemporary Hyderabad-inspired Indian café digital experience combining an interactive procedural Three.js architectural lounge, online ordering, table reservations, and a role-based business operations dashboard backed by Cloud SQL (PostgreSQL) and Firebase Authentication.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Three.js (`RoomEnvironment`, procedural PBR textures, `OrbitControls`, raycast hotspots, 2D fallback)
- **Backend:** Express.js (`server.ts`)
- **Database:** PostgreSQL (Cloud SQL) + Drizzle ORM (`src/db/schema.ts`)
- **Auth & RBAC:** Firebase Authentication (Google Sign-In) + `firebase-admin` server verification

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (`SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`, plus `.env.example` keys).
3. Push database schema:
   ```bash
   npx drizzle-kit push --config=src/db/drizzle.config.ts
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Build and run production:
   ```bash
   npm run build
   npm start
   ```

## Documentation

- `docs/3D_ASSET_INVENTORY.md` — Asset discovery audit and 3D model intake guide.
- `docs/DEPLOYMENT_AND_OPERATIONS.md` — Production checklist, security safeguards, and handover notes.
