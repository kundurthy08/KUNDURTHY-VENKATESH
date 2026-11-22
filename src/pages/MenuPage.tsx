import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Tag } from 'lucide-react';
import { useCafe } from '../context/CafeContext';
import { formatINR } from '../types';

export const MenuPage: React.FC = () => {
  const {
    categories,
    menuItems,
    offers,
    loadingBootstrap,
    bootstrapError,
    setSelectedProduct,
  } = useCafe();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      if (selectedCategoryId !== 'all' && item.categoryId !== selectedCategoryId) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.dietaryTag.toLowerCase().includes(q)
      );
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  const categoryNameMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  const hasDraftSamples = menuItems.some((m) => m.isDraftSample);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Page Title & Search */}
      <div className="border-b border-[#30231C]/12 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8C3E25]">
            Culinary Catalogue
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold text-[#173E32]">
            Our Café Menu
          </h1>
          <p className="mt-3 text-base text-[#514B42] max-w-2xl">
            Explore slow-simmered Irani chai, warm Bun Maska, spiced Indian snacks, and Hyderabadi
            specials. Prices and availability are verified live from our kitchen system.
          </p>
          {hasDraftSamples && (
            <p className="mt-2 text-xs text-[#8C3E25] font-medium">
              Note: Items marked “Draft Preview” are sample launch catalogue entries pending final
              owner price &amp; recipe confirmation in the Admin Portal.
            </p>
          )}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#706B62] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chai, bun maska, snacks..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#30231C]/20 bg-[#FFFDF8] text-sm focus:outline-none focus:border-[#173E32]"
          />
        </div>
      </div>

      {/* Active Menu Offers Strip */}
      {offers.length > 0 && (
        <div className="bg-[#173E32] text-[#F0E5D0] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D5AE70]/25">
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-[#D5AE70] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#D5AE70]">
                Active Menu Offer
              </p>
              <p className="text-sm font-semibold mt-0.5">
                {offers[0].title} —{' '}
                <span className="font-mono-tabular text-[#D5AE70]">CODE: {offers[0].code}</span>
              </p>
              <p className="text-xs text-[#F0E5D0]/80 mt-0.5">{offers[0].description}</p>
            </div>
          </div>
          <span className="text-xs text-[#D5AE70] whitespace-nowrap">
            Apply in Order Bag at checkout
          </span>
        </div>
      )}

      {/* Category Filter Segmented Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <SlidersHorizontal className="w-4 h-4 text-[#706B62] shrink-0 mr-1" />
        <button
          type="button"
          onClick={() => setSelectedCategoryId('all')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            selectedCategoryId === 'all'
              ? 'bg-[#173E32] text-[#F0E5D0]'
              : 'bg-[#FFFDF8] text-[#30231C] border border-[#30231C]/15 hover:border-[#173E32]'
          }`}
        >
          All Offerings
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategoryId === cat.id
                ? 'bg-[#173E32] text-[#F0E5D0]'
                : 'bg-[#FFFDF8] text-[#30231C] border border-[#30231C]/15 hover:border-[#173E32]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {bootstrapError && (
        <div className="p-6 rounded-xl bg-[#8C3E25]/10 border border-[#8C3E25]/30 text-sm text-[#8C3E25]">
          {bootstrapError}
        </div>
      )}

      {loadingBootstrap ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-96 rounded-2xl bg-[#FFFDF8] border border-[#30231C]/10 animate-pulse"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12">
          <p className="font-display text-2xl text-[#173E32]">No matching dishes found</p>
          <p className="mt-2 text-sm text-[#706B62]">
            Try clearing your search filter or choosing another menu category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              onClick={() => setSelectedProduct(item)}
              className={`group bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 overflow-hidden flex flex-col transition-transform cursor-pointer ${
                item.available ? 'hover:-translate-y-0.5' : 'opacity-75'
              }`}
            >
              <div className="aspect-[4/3] bg-[#173E32]/10 overflow-hidden relative">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#706B62]">
                    <span>{categoryNameMap.get(item.categoryId) || 'Café Selection'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.dietaryTag}</span>
                    {item.isDraftSample && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Draft Preview</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#173E32]">
                    {item.name}
                  </h2>
                  <p className="mt-2 text-sm text-[#514B42] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#30231C]/10 flex items-center justify-between gap-3">
                  <span className="font-mono-tabular text-base font-semibold text-[#173E32]">
                    {formatINR(item.basePricePaise)}
                  </span>
                  {item.available ? (
                    <span className="px-3.5 py-1.5 rounded-lg bg-[#173E32] text-[#F0E5D0] text-xs font-semibold group-hover:bg-[#8C3E25] transition-colors">
                      Select &amp; Add
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#8C3E25]">Sold Out</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
