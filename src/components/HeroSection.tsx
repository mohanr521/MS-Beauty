import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { AppPage } from '../utils/routing.ts';

interface HeroSectionProps {
  onNavigate: (page: AppPage) => void;
}

const STUDIO_PILLARS = [
  {
    index: '01.',
    title: 'Botanical Formulations',
    detail: 'Cold-pressed plant actives and barrier-first clinical serums tailored to each complexion.',
  },
  {
    index: '02.',
    title: 'Master Aestheticians',
    detail: 'Senior facialists, bridal directors, and trichology specialists with 8–12 years of craft.',
  },
  {
    index: '03.',
    title: 'Private Treatment Suites',
    detail: 'Sunlit travertine rooms designed for unhurried, one-on-one restorative beauty sessions.',
  },
  {
    index: '04.',
    title: 'Live Appointment Sync',
    detail: 'Real-time specialist availability with instant reservation confirmation and rescheduling.',
  },
];

const PAGE_DIRECTORY: ReadonlyArray<{
  page: AppPage;
  kicker: string;
  title: string;
  description: string;
  cta: string;
}> = [
  {
    page: 'services',
    kicker: 'Service Menu',
    title: 'Gallery of Treatments',
    description:
      'Browse facials, bridal artistry, botanical scalp rituals, and hand spa sessions with full ingredient sequences.',
    cta: 'View Services',
  },
  {
    page: 'specialists',
    kicker: 'Practitioners',
    title: 'Master Specialists',
    description:
      'Meet our senior aestheticians, bridal directors, and trichology artists and book directly with your favorite.',
    cta: 'Meet the Team',
  },
  {
    page: 'appointments',
    kicker: 'Reservations',
    title: 'Manage Your Bookings',
    description:
      'Look up existing appointments by reference code or email to confirm times, reschedule, or cancel.',
    cta: 'Find Booking',
  },
];

export function HeroSection({ onNavigate }: HeroSectionProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <section id="top" className="bg-[#FAF9F7]">
      <div className="mx-auto max-w-[1200px] px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left editorial column */}
          <div className="flex flex-col justify-between py-2 lg:col-span-6">
            <div>
              <p className="text-xs font-medium tracking-wider text-[#635C56]">
                San Francisco · Botanical Beauty Parlour
              </p>

              <h1
                className="mt-4 font-display font-semibold tracking-tight text-[#171412] text-balance"
                style={{ fontSize: 'clamp(2.5rem, 4.4vw, 3.75rem)', lineHeight: 1.06 }}
              >
                Quiet luxury for skin, hair, and bridal artistry.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#635C56]">
                MS Cosmetics blends holistic botanical treatments with precision aesthetic craft.
                Explore our signature service gallery and reserve your preferred specialist online
                with real-time studio availability.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('booking')}
                  className="inline-flex items-center gap-2.5 rounded-md bg-[#3D1C2E] px-6 py-3 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#2B1220] cursor-pointer"
                >
                  <span>Book Appointment</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="inline-flex items-center justify-center rounded-md border border-[#D5CFC6] bg-white px-6 py-3 text-sm font-medium text-[#171412] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-[#171412] hover:bg-[#F2F0EC] cursor-pointer"
                >
                  Explore Services
                </button>
              </div>
            </div>

            <div className="mt-10 border-t border-[#E5E1DA] pt-6">
              <dl className="grid grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <dt className="text-xs text-[#635C56] whitespace-nowrap">Signature Rituals</dt>
                  <dd className="mt-1 font-display text-xl font-semibold text-[#171412] tabular-nums whitespace-nowrap sm:text-2xl">
                    6 Curated
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#635C56] whitespace-nowrap">Studio Hours</dt>
                  <dd className="mt-1 font-display text-xl font-semibold text-[#171412] tabular-nums whitespace-nowrap sm:text-2xl">
                    9:30 – 6:30
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#635C56] whitespace-nowrap">Lead Specialists</dt>
                  <dd className="mt-1 font-display text-xl font-semibold text-[#171412] tabular-nums whitespace-nowrap sm:text-2xl">
                    4 Masters
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Right focal photography column */}
          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[320px] overflow-hidden rounded-lg border border-[#E5E1DA] bg-[#F2F0EC]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_parlour_sanctuary_1795442359903.jpg"
                  alt="Sunlit MS Cosmetics beauty parlour interior with travertine counters and amber botanical apothecary bottles"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover aspect-[4/3] lg:aspect-auto"
                />
              ) : (
                <div className="flex h-full min-h-[340px] flex-col items-center justify-center bg-gradient-to-br from-[#F2F0EC] to-[#E5E1DA] p-8 text-center">
                  <Sparkles className="h-8 w-8 text-[#3D1C2E]" aria-hidden="true" />
                  <p className="mt-3 font-display text-2xl font-semibold text-[#171412]">
                    MS Cosmetics Sanctuary
                  </p>
                  <p className="mt-1 text-sm text-[#635C56]">
                    Botanical Skincare &amp; Bridal Studio
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-width 4-column sanctuary strip */}
        <div className="mt-12 grid grid-cols-1 gap-6 border-t border-[#E5E1DA] pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_PILLARS.map((pillar) => (
            <div key={pillar.index} className="space-y-1.5">
              <p className="text-xs font-medium text-[#A67C52] tabular-nums">{pillar.index}</p>
              <h2 className="font-display text-xl font-semibold text-[#171412]">
                {pillar.title}
              </h2>
              <p className="text-sm leading-relaxed text-[#635C56]">{pillar.detail}</p>
            </div>
          ))}
        </div>

        {/* Studio Directory cards linking to each dedicated page */}
        <div className="mt-12 grid grid-cols-1 gap-6 border-t border-[#E5E1DA] pt-10 md:grid-cols-3">
          {PAGE_DIRECTORY.map((item) => (
            <div
              key={item.page}
              className="flex flex-col justify-between rounded-lg border border-[#E5E1DA] bg-white p-6"
            >
              <div>
                <p className="text-xs font-medium text-[#A67C52]">{item.kicker}</p>
                <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#171412]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#635C56]">{item.description}</p>
              </div>
              <div className="mt-5 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#3D1C2E] hover:underline hover:underline-offset-4 cursor-pointer"
                >
                  <span>{item.cta}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
