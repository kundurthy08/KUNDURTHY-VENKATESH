import React from 'react';
import { useCafe } from '../context/CafeContext';
import { CinematicCafeHero } from '../components/cinema/CinematicCafeHero';

const HERITAGE_PILLARS = [
  {
    number: '01',
    title: 'Hyderabadi Archways',
    summary:
      'Cusped Deccani archways and lime-plastered vaults finished in deep heritage green and warm terracotta.',
  },
  {
    number: '02',
    title: 'Carved Timber Jaali',
    summary:
      'Geometric teakwood latticework designed to soften late-afternoon sunbeams into quiet courtyard patterns.',
  },
  {
    number: '03',
    title: 'Brass Samovar Ritual',
    summary:
      'Hand-hammered brass vessels, honed cream marble, and unhurried hospitality inspired by old Hyderabad.',
  },
];

export const HomePage: React.FC = () => {
  const { setRoute, contentBlocks, cartCount, setCartOpen } = useCafe();

  const storyBlock = contentBlocks.find((c) => c.key === 'our_story');
  const atmosphereBlock = contentBlocks.find((c) => c.key === 'cafe_atmosphere');

  const handleOrderNow = () => {
    if (cartCount > 0) {
      setCartOpen(true);
    } else {
      setRoute('menu');
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Flagship Cinematic Architectural Film Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <CinematicCafeHero
          onNavigate={(target) => setRoute(target)}
          onOrderNow={handleOrderNow}
        />
      </section>

      {/* 2. Café History & Heritage */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-8 sm:p-12 lg:p-14 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8C3E25]">
                Our History &amp; Heritage
              </p>
              <h2 className="mt-2 font-display text-4xl sm:text-5xl font-semibold text-[#173E32] text-balance leading-[1.08]">
                {storyBlock?.title || 'Crafted Around Hyderabad’s Living Café Culture'}
              </h2>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <p className="text-base text-[#514B42] leading-relaxed">
                {storyBlock?.body ||
                  'Charminar Café brings together the architectural grace of old Hyderabad—cusped arches, carved jaali screens, and hammered brass—with unhurried contemporary hospitality.'}
              </p>
              <p className="text-sm text-[#514B42] leading-relaxed">
                {atmosphereBlock?.body ||
                  'Every corner pays quiet tribute to Hyderabad’s timeless gathering spaces—where slow-simmered chai, warm conversation, and Deccani craftsmanship meet.'}
              </p>
              {!storyBlock?.isVerified && (
                <p className="text-xs text-[#706B62]">
                  Draft narrative preview — the café owner can edit and verify final history copy
                  inside the Admin Portal.
                </p>
              )}
              <div className="pt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setRoute('story')}
                  className="px-5 py-2.5 rounded-lg bg-[#173E32] text-[#F0E5D0] text-sm font-semibold hover:bg-[#215243] transition-colors cursor-pointer"
                >
                  Read Full Heritage Story
                </button>
                <button
                  type="button"
                  onClick={() => setRoute('menu')}
                  className="px-5 py-2.5 rounded-lg border border-[#30231C]/20 text-[#173E32] text-sm font-semibold hover:bg-[#F0E5D0] transition-colors cursor-pointer"
                >
                  Explore Menu
                </button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#30231C]/10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {HERITAGE_PILLARS.map((pillar) => (
              <div key={pillar.number} className="space-y-2">
                <p className="font-mono-tabular text-xs font-semibold text-[#8C3E25]">
                  {pillar.number}
                </p>
                <h3 className="font-display text-2xl font-semibold text-[#173E32]">
                  {pillar.title}
                </h3>
                <p className="text-sm text-[#514B42] leading-relaxed">{pillar.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
