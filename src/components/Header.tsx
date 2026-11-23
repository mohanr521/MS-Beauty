import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Menu, X } from 'lucide-react';
import type { AppPage } from '../utils/routing.ts';
import { pathForPage } from '../utils/routing.ts';

interface HeaderProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const NAV_ITEMS: ReadonlyArray<{ page: AppPage; label: string }> = [
  { page: 'home', label: 'Home' },
  { page: 'services', label: 'Services' },
  { page: 'specialists', label: 'Specialists' },
  { page: 'booking', label: 'Book Online' },
  { page: 'appointments', label: 'My Bookings' },
];

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLinkClick(e: MouseEvent<HTMLAnchorElement>, page: AppPage) {
    e.preventDefault();
    setMobileOpen(false);
    onNavigate(page);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E1DA] bg-[#FAF9F7]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, 'home')}
          className="font-display text-2xl font-semibold tracking-tight text-[#171412] whitespace-nowrap shrink-0"
        >
          MS Cosmetics
        </a>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const active = currentPage === item.page;
            return (
              <a
                key={item.page}
                href={pathForPage(item.page)}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => handleLinkClick(e, item.page)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors duration-150 ${
                  active
                    ? 'text-[#171412] underline decoration-[#3D1C2E] decoration-2 underline-offset-8'
                    : 'text-[#635C56] hover:text-[#171412] hover:underline hover:underline-offset-8'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigate('booking');
            }}
            className="hidden sm:inline-flex items-center justify-center rounded-md bg-[#3D1C2E] px-5 py-2.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#2B1220] cursor-pointer"
          >
            Book Appointment
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#E5E1DA] text-[#171412] md:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#E5E1DA] bg-[#FAF9F7] px-6 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active = currentPage === item.page;
              return (
                <a
                  key={item.page}
                  href={pathForPage(item.page)}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => handleLinkClick(e, item.page)}
                  className={`py-2.5 text-base border-b border-[#E5E1DA]/60 last:border-b-0 ${
                    active ? 'font-semibold text-[#3D1C2E]' : 'font-medium text-[#171412]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate('booking');
              }}
              className="mt-2 w-full rounded-md bg-[#3D1C2E] px-5 py-3 text-sm font-medium text-white cursor-pointer"
            >
              Book Appointment
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
