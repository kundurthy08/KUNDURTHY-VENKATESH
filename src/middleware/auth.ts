import type { Request, Response, NextFunction } from 'express';
import { eq, sql } from 'drizzle-orm';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

export type StaffRole = 'owner' | 'manager' | 'order_staff' | 'content_editor' | 'customer';

export interface DbUserRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  role: string;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: DbUserRecord;
}

const INITIAL_OWNER_EMAIL = (process.env.OWNER_EMAIL || 'kundurthy08@gmail.com').toLowerCase();

export async function getOrCreateDbUser(
  uid: string,
  email: string,
  displayName?: string
): Promise<DbUserRecord> {
  try {
    const normalizedEmail = email.toLowerCase();
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const current = existing[0];
      if (normalizedEmail === INITIAL_OWNER_EMAIL && current.role !== 'owner') {
        const updated = await db
          .update(users)
          .set({ role: 'owner', displayName: displayName || current.displayName, updatedAt: new Date() })
          .where(eq(users.id, current.id))
          .returning();
        return updated[0];
      }
      return current;
    }

    const ownerCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'owner'));
    const hasOwner = (ownerCountResult[0]?.count ?? 0) > 0;
    const assignedRole: StaffRole =
      normalizedEmail === INITIAL_OWNER_EMAIL || !hasOwner ? 'owner' : 'customer';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        displayName: displayName || null,
        role: assignedRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          displayName: displayName || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database error syncing user:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;
    const email = decoded.email || `${decoded.uid}@charminar-guest.local`;
    req.dbUser = await getOrCreateDbUser(decoded.uid, email, decoded.name);
    return next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication session.' });
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decoded;
    const email = decoded.email || `${decoded.uid}@charminar-guest.local`;
    req.dbUser = await getOrCreateDbUser(decoded.uid, email, decoded.name);
  } catch {
    // Allow guest access when optional token is absent or invalid
  }
  return next();
};

export const requireRole = (allowedRoles: StaffRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.dbUser.role as StaffRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions for this café operations action.',
      });
    }
    return next();
  };
};
