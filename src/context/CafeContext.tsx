import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import type {
  AppRoute,
  Branch,
  CartItem,
  MenuCategory,
  MenuItem,
  Offer,
  SiteContentBlock,
  UserProfile,
} from '../types';

interface CafeContextValue {
  route: AppRoute;
  setRoute: (route: AppRoute) => void;
  branches: Branch[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  offers: Offer[];
  contentBlocks: SiteContentBlock[];
  loadingBootstrap: boolean;
  bootstrapError: string | null;
  refreshBootstrap: () => Promise<void>;
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: MenuItem, quantity: number, selectedOptionIds: string[]) => void;
  updateCartQuantity: (cartKey: string, quantity: number) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotalPaise: number;
  selectedProduct: MenuItem | null;
  setSelectedProduct: (item: MenuItem | null) => void;
  firebaseUser: User | null;
  dbUser: UserProfile | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const CafeContext = createContext<CafeContextValue | null>(null);

export function CafeProvider({ children }: { children: React.ReactNode }) {
  const [route, setRouteState] = useState<AppRoute>('home');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [contentBlocks, setContentBlocks] = useState<SiteContentBlock[]>([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('charminar_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const setRoute = useCallback((next: AppRoute) => {
    setRouteState(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      setLoadingBootstrap(true);
      setBootstrapError(null);
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) throw new Error('Could not load café catalogue');
      const data = await res.json();
      setBranches(data.branches || []);
      setCategories(data.categories || []);
      setMenuItems(data.items || []);
      setOffers(data.offers || []);
      setContentBlocks(data.content || []);
    } catch (err: unknown) {
      setBootstrapError(err instanceof Error ? err.message : 'Unable to connect to server');
    } finally {
      setLoadingBootstrap(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  useEffect(() => {
    try {
      sessionStorage.setItem('charminar_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore storage failure
    }
  }, [cart]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setDbUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDbUser(data.user || null);
        }
      } catch {
        setDbUser(null);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleAuthProvider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setDbUser(null);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const addToCart = useCallback(
    (item: MenuItem, quantity: number, selectedOptionIds: string[]) => {
      if (!item.available) return;
      const sortedIds = [...selectedOptionIds].sort();
      const cartKey = `${item.id}:${sortedIds.join(',')}`;

      let delta = 0;
      const labels: string[] = [];
      for (const group of item.modifiersJson || []) {
        for (const opt of group.options) {
          if (sortedIds.includes(opt.id)) {
            delta += opt.priceDeltaPaise;
            labels.push(opt.label);
          }
        }
      }
      const unitPricePaise = item.basePricePaise + delta;

      setCart((prev) => {
        const existing = prev.find((c) => c.cartKey === cartKey);
        if (existing) {
          return prev.map((c) =>
            c.cartKey === cartKey ? { ...c, quantity: c.quantity + quantity } : c
          );
        }
        return [
          ...prev,
          {
            cartKey,
            menuItem: item,
            quantity,
            selectedOptionIds: sortedIds,
            selectedOptionLabels: labels,
            unitPricePaise,
          },
        ];
      });
    },
    []
  );

  const updateCartQuantity = useCallback((cartKey: string, quantity: number) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((c) => c.cartKey !== cartKey)
        : prev.map((c) => (c.cartKey === cartKey ? { ...c, quantity } : c))
    );
  }, []);

  const removeFromCart = useCallback((cartKey: string) => {
    setCart((prev) => prev.filter((c) => c.cartKey !== cartKey));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotalPaise = cart.reduce(
    (sum, item) => sum + item.unitPricePaise * item.quantity,
    0
  );

  return (
    <CafeContext.Provider
      value={{
        route,
        setRoute,
        branches,
        categories,
        menuItems,
        offers,
        contentBlocks,
        loadingBootstrap,
        bootstrapError,
        refreshBootstrap,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotalPaise,
        selectedProduct,
        setSelectedProduct,
        firebaseUser,
        dbUser,
        authLoading,
        signInWithGoogle,
        logout,
        getIdToken,
      }}
    >
      {children}
    </CafeContext.Provider>
  );
}

export function useCafe() {
  const ctx = useContext(CafeContext);
  if (!ctx) throw new Error('useCafe must be used within CafeProvider');
  return ctx;
}
