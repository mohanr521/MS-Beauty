import type { MouseEvent } from 'react';
import type { AppPage } from '../utils/routing.ts';
import { pathForPage } from '../utils/routing.ts';

interface FooterProps {
  onNavigate: (page: AppPage) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  function handleNav(e: MouseEvent<HTMLAnchorElement>, page: AppPage) {
    e.preventDefault();
    onNavigate(page);
  }

  return (
    <footer className="bg-[#171412] py-12 text-[#FAF9F7]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 gap-8 border-b border-white/15 pb-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="font-display text-2xl font-semibold tracking-tight text-white">
              MS Cosmetics
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#C8C0B8]">
              Botanical beauty parlour and private skincare sanctuary in San Francisco. Thoughtfully
              formulated facial, bridal, hair, and nail rituals.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold tracking-wide text-[#A67C52]">Studio Hours</h3>
            <dl className="mt-3 space-y-1.5 text-sm text-[#C8C0B8] tabular-nums">
              <div className="flex justify-between gap-4">
                <dt>Tue – Fri</dt>
                <dd>9:30 AM – 6:30 PM</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Saturday</dt>
                <dd>9:30 AM – 5:30 PM</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Sun – Mon</dt>
                <dd>By Private Request</dd>
              </div>
            </dl>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold tracking-wide text-[#A67C52]">
              Sanctuary &amp; Reservations
            </h3>
            <p className="mt-3 text-sm text-[#C8C0B8]">418 Sutter Street, Suite 302, San Francisco</p>
            <p className="mt-1 text-sm text-[#C8C0B8]">concierge@mscosmetics.studio</p>
            <div className="mt-4 flex flex-wrap gap-5 text-xs font-medium text-white">
              <a
                href={pathForPage('home')}
                onClick={(e) => handleNav(e, 'home')}
                className="hover:underline hover:underline-offset-4"
              >
                Home
              </a>
              <a
                href={pathForPage('services')}
                onClick={(e) => handleNav(e, 'services')}
                className="hover:underline hover:underline-offset-4"
              >
                Services
              </a>
              <a
                href={pathForPage('specialists')}
                onClick={(e) => handleNav(e, 'specialists')}
                className="hover:underline hover:underline-offset-4"
              >
                Specialists
              </a>
              <a
                href={pathForPage('booking')}
                onClick={(e) => handleNav(e, 'booking')}
                className="hover:underline hover:underline-offset-4"
              >
                Book Online
              </a>
              <a
                href={pathForPage('appointments')}
                onClick={(e) => handleNav(e, 'appointments')}
                className="hover:underline hover:underline-offset-4"
              >
                Manage Booking
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[#9A9189]">
          <p>© {new Date().getFullYear()} MS Cosmetics Beauty Parlour. All rights reserved.</p>
          <p>Botanical Skincare · Bridal Artistry · Holistic Spa</p>
        </div>
      </div>
    </footer>
  );
}
