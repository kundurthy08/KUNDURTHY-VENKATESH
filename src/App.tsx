/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CafeProvider, useCafe } from './context/CafeContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/ordering/CartDrawer';
import { ProductModal } from './components/menu/ProductModal';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { StoryPage } from './pages/StoryPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ContactPage, PoliciesPage } from './pages/ContactPoliciesPage';
import { PortalAdminPage } from './pages/PortalAdminPage';

function CafeShell() {
  const { route } = useCafe();

  return (
    <div className="min-h-screen flex flex-col bg-[#F4EDDF] text-[#30231C]">
      <Navbar />
      <main className="flex-1">
        {route === 'home' && <HomePage />}
        {route === 'story' && <StoryPage />}
        {route === 'menu' && <MenuPage />}
        {route === 'reservations' && <ReservationsPage />}
        {route === 'contact' && <ContactPage />}
        {route === 'policies' && <PoliciesPage />}
        {route === 'portal' && <PortalAdminPage />}
      </main>
      <Footer />
      <CartDrawer />
      <ProductModal />
    </div>
  );
}

export default function App() {
  return (
    <CafeProvider>
      <CafeShell />
    </CafeProvider>
  );
}
