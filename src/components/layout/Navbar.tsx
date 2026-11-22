import React, { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useCafe } from '../../context/CafeContext';
import type { AppRoute } from '../../types';

const NAV_LINKS: Array<{ route: AppRoute; label: string }> = [
  { route: 'story', label: 'Our Story' },
  { route: 'menu', label: 'Menu' },
  { route: 'reservations', label: 'Reservations' },
  { route: 'contact', label: 'Contact' },
  { route: 'portal', label: 'Portal' },
];

export const Navbar: React.FC = () => {
  const { route, setRoute, cartCount, setCartOpen } = useCafe();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (next: AppRoute) => {
    setRoute(next);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F4EDDF]/95 border-b border-[#30231C]/12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-2xl font-bold tracking-tight text-[#173E32] whitespace-nowrap shrink-0 hover:text-[#8C3E25] transition-colors cursor-pointer"
        >
          Charminar Café
        </button>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#30231C]/80"
        >
          {NAV_LINKS.map((link) => {
            const active = route === link.route;
            return (
              <button
                key={link.route}
                type="button"
                onClick={() => handleNav(link.route)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'border-[#8C3E25] text-[#173E32] font-semibold'
                    : 'border-transparent hover:text-[#173E32] hover:border-[#D5AE70]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#173E32] text-[#F4EDDF] text-xs font-semibold hover:bg-[#215243] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#D5AE70]" />
            <span className="font-mono-tabular">Order Bag ({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-[#173E32] hover:bg-[#30231C]/10 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FFFDF8] border-b border-[#30231C]/12 px-4 py-3 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
              route === 'home' ? 'bg-[#173E32] text-[#F4EDDF]' : 'text-[#30231C]'
            }`}
          >
            Home
          </button>
          {NAV_LINKS.map((link) => (
            <button
              key={link.route}
              type="button"
              onClick={() => handleNav(link.route)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                route === link.route ? 'bg-[#173E32] text-[#F4EDDF]' : 'text-[#30231C]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
