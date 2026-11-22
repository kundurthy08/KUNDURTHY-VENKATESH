import React from 'react';
import { useCafe } from '../context/CafeContext';

export const StoryPage: React.FC = () => {
  const { contentBlocks, setRoute } = useCafe();
  const story = contentBlocks.find((c) => c.key === 'our_story');
  const atmosphere = contentBlocks.find((c) => c.key === 'cafe_atmosphere');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8C3E25]">
          Brand Philosophy & Craft
        </p>
        <h1 className="mt-2 font-display text-5xl font-semibold text-[#173E32] text-balance">
          {story?.title || 'Crafted Around Hyderabad’s Living Café Culture'}
        </h1>
        <p className="mt-5 text-base text-[#514B42] leading-relaxed">
          {story?.body ||
            'Charminar Café brings together the architectural grace of old Hyderabad—cusped arches, carved jaali screens, and hammered brass—with unhurried contemporary hospitality.'}
        </p>
        {!story?.isVerified && (
          <p className="mt-3 text-xs text-[#8C3E25] font-medium">
            Draft Brand Copy — Owner can update & approve final café story in the Portal.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        <div className="rounded-2xl overflow-hidden border border-[#30231C]/12 bg-[#173E32] min-h-[340px]">
          <img
            src="/src/assets/images/nizam_palace_hall_1795363759621.jpg"
            alt="Charminar Café Royal Nizam grand hall interior"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 p-8 sm:p-10 flex flex-col justify-center space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8C3E25]">
              01. Architectural Identity
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#173E32]">
              {atmosphere?.title || 'Architecture, Warmth & Ritual'}
            </h2>
            <p className="mt-3 text-sm text-[#514B42] leading-relaxed">
              {atmosphere?.body ||
                'Every detail—from deep heritage green plaster and warm teak tables to the aroma of slow-simmered chai—is designed as a calm sanctuary.'}
            </p>
          </div>

          <div className="pt-5 border-t border-[#30231C]/10 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-display text-xl font-semibold text-[#173E32]">
                Material Honesty
              </h3>
              <p className="mt-1.5 text-xs text-[#514B42] leading-relaxed">
                Deep heritage green lime finishes, warm terracotta ceramics, hammered brass vessels,
                and seasoned teak furniture.
              </p>
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-[#173E32]">
                Hyderabadi Hospitality
              </h3>
              <p className="mt-1.5 text-xs text-[#514B42] leading-relaxed">
                Generous conversation, slow-steeped chai rituals, and warm bakery pairings crafted
                fresh throughout the day.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRoute('menu')}
              className="px-5 py-2.5 rounded-lg bg-[#173E32] text-[#F4EDDF] text-sm font-semibold hover:bg-[#215243] transition-colors cursor-pointer"
            >
              Explore Our Menu
            </button>
            <button
              type="button"
              onClick={() => setRoute('reservations')}
              className="px-5 py-2.5 rounded-lg border border-[#30231C]/20 text-[#173E32] text-sm font-semibold hover:bg-[#F4EDDF] transition-colors cursor-pointer"
            >
              Reserve a Table
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Royal Nizam Craft & Lounge Diptych */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 overflow-hidden">
          <div className="aspect-[16/9] bg-[#173E32]">
            <img
              src="/src/assets/images/nizam_samovar_counter_1795363760681.jpg"
              alt="Royal Nizam brass samovar counter and porcelain Irani chai service"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6">
            <p className="text-xs text-[#8C3E25] font-medium">Royal Heritage · Samovar Craft</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-[#173E32]">
              The Brass Samovar &amp; Vitrine Bar
            </h3>
            <p className="mt-2 text-sm text-[#514B42]">
              Hand-hammered brass samovars, gold-rimmed porcelain, and terracotta Nizami arches
              anchored along honed cream marble.
            </p>
          </div>
        </div>

        <div className="bg-[#FFFDF8] rounded-2xl border border-[#30231C]/12 overflow-hidden">
          <div className="aspect-[16/9] bg-[#173E32]">
            <img
              src="/src/assets/images/nizam_divan_alcove_1795363759678.jpg"
              alt="Royal Nizam emerald velvet divan alcove behind carved jaali screens"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-6">
            <p className="text-xs text-[#8C3E25] font-medium">Royal Heritage · Divan Alcoves</p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-[#173E32]">
              Gilded Arches &amp; Carved Jaali Alcoves
            </h3>
            <p className="mt-2 text-sm text-[#514B42]">
              Plush deep emerald seating tucked behind antique teakwood latticework under warm
              Deccani brass lanterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
