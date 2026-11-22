import React from 'react';
import { useCafe } from '../../context/CafeContext';

export const Footer: React.FC = () => {
  const { setRoute, branches } = useCafe();
  const primaryBranch = branches[0];

  return (
    <footer className="bg-[#173E32] text-[#F4EDDF] border-t border-[#D5AE70]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <h2 className="font-display text-3xl font-semibold text-[#D5AE70]">Charminar Café</h2>
          <p className="mt-3 text-sm text-[#F4EDDF]/85 max-w-md leading-relaxed">
            A contemporary Indian café inspired by Hyderabad’s architectural heritage, traditional
            hospitality, and unhurried café craft.
          </p>
          {primaryBranch && (
            <div className="mt-5 text-xs text-[#F4EDDF]/80 space-y-1">
              <p className="font-medium text-[#D5AE70]">{primaryBranch.name}</p>
              <p>{primaryBranch.addressLine}</p>
              <p>{primaryBranch.openingHours}</p>
              {!primaryBranch.isVerified && (
                <p className="text-[#D5AE70]/90 pt-1">
                  Draft outlet details shown — update verified address & hours in Portal.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D5AE70]">
            Explore
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#F4EDDF]/85">
            <li>
              <button
                type="button"
                onClick={() => setRoute('home')}
                className="hover:text-[#D5AE70] transition-colors cursor-pointer"
              >
                Home &amp; Heritage
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setRoute('story')}
                className="hover:text-[#D5AE70] transition-colors cursor-pointer"
              >
                Our Story
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setRoute('menu')}
                className="hover:text-[#D5AE70] transition-colors cursor-pointer"
              >
                Menu & Ordering
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setRoute('reservations')}
                className="hover:text-[#D5AE70] transition-colors cursor-pointer"
              >
                Table Reservations
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D5AE70]">
            Information
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[#F4EDDF]/85">
            <li>
              <button
                type="button"
                onClick={() => setRoute('contact')}
                className="hover:text-[#D5AE70] transition-colors cursor-pointer"
              >
                Location & Contact
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setRoute('policies')}
                className="hover:text-[#D5AE70] transition-colors cursor-pointer"
              >
                Privacy, Terms & Refunds
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setRoute('portal')}
                className="hover:text-[#D5AE70] transition-colors cursor-pointer"
              >
                Customer & Staff Portal
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#F4EDDF]/12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#F4EDDF]/70">
          <span>© {new Date().getFullYear()} Charminar Café. All rights reserved.</span>
          <span>Hyderabad Heritage · Contemporary Hospitality</span>
        </div>
      </div>
    </footer>
  );
};
