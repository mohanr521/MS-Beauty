import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import type { ServiceCategory, ServiceItem } from '../types/parlour.ts';
import {
  filterServices,
  formatDuration,
  formatPrice,
  SERVICE_CATEGORIES,
} from '../utils/bookingRules.ts';

interface ServicesGalleryProps {
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectServiceDetails: (service: ServiceItem) => void;
  onBookService: (service: ServiceItem) => void;
}

function ServiceCard({
  service,
  onSelectDetails,
  onBook,
}: {
  service: ServiceItem;
  onSelectDetails: (service: ServiceItem) => void;
  onBook: (service: ServiceItem) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article
      data-testid={`service-card-${service.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-[#E5E1DA] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onSelectDetails(service)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F2F0EC] text-left cursor-pointer"
        aria-label={`View details for ${service.name}`}
      >
        {!imgFailed ? (
          <img
            src={service.imageUrl}
            alt={service.name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F2F0EC] to-[#E5E1DA] p-6 text-center">
            <Sparkles className="h-6 w-6 text-[#3D1C2E]" aria-hidden="true" />
            <span className="mt-2 font-display text-lg font-semibold text-[#171412]">
              {service.name}
            </span>
          </div>
        )}
      </button>

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          {/* Clean unboxed metadata with typographic separator */}
          <div className="flex items-center gap-2 text-xs font-medium text-[#635C56]">
            <span>{service.category}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDuration(service.durationMinutes)}</span>
          </div>

          <h3 className="mt-2 font-display text-2xl font-semibold text-[#171412]">
            {service.name}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-[#635C56]">
            {service.shortDescription}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#E5E1DA] pt-4">
          <span className="text-base font-semibold text-[#171412] tabular-nums">
            {formatPrice(service.priceUsd)}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectDetails(service)}
              className="rounded-md border border-[#D5CFC6] bg-white px-3.5 py-2 text-xs font-medium text-[#171412] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#F2F0EC] cursor-pointer"
            >
              View Ritual
            </button>
            <button
              type="button"
              onClick={() => onBook(service)}
              className="rounded-md bg-[#3D1C2E] px-4 py-2 text-xs font-medium text-white whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#2B1220] cursor-pointer"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ServicesGallery({
  services,
  loading,
  error,
  onRetry,
  onSelectServiceDetails,
  onBookService,
}: ServicesGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = filterServices(services, activeCategory, searchQuery);

  return (
    <section id="services" className="bg-[#FAF9F7] py-14 lg:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider text-[#A67C52]">
              Curated Service Menu
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[#171412] sm:text-5xl text-balance">
              Gallery of Services
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#635C56]">
              Select any treatment to inspect its step-by-step botanical sequence or reserve it
              directly with our specialists.
            </p>
          </div>

          <div className="w-full md:w-72">
            <label htmlFor="service-search-input" className="sr-only">
              Search beauty services or botanical ingredients
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#635C56]"
                aria-hidden="true"
              />
              <input
                id="service-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search facials, bridal, neroli..."
                className="w-full rounded-md border border-[#D5CFC6] bg-white py-2.5 pr-4 pl-10 text-sm text-[#171412] placeholder:text-[#8E857D] focus:border-[#3D1C2E] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Interactive Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter services by category"
          className="mt-8 flex flex-wrap items-center gap-1.5 rounded-lg border border-[#E5E1DA] bg-[#F2F0EC] p-1.5"
        >
          {SERVICE_CATEGORIES.map((category) => {
            const active = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(category)}
                className={`rounded-md px-4 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
                  active
                    ? 'bg-white text-[#171412] shadow-xs'
                    : 'text-[#635C56] hover:text-[#171412]'
                }`}
              >
                {category === 'All' ? 'All Services' : category}
              </button>
            );
          })}
        </div>

        {/* States: Loading / Error / Empty / Grid */}
        {loading ? (
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-96 animate-pulse rounded-lg border border-[#E5E1DA] bg-[#F2F0EC]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-lg border border-[#E5E1DA] bg-white p-8 text-center">
            <p className="text-sm font-medium text-[#171412]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 rounded-md bg-[#3D1C2E] px-5 py-2.5 text-xs font-medium text-white cursor-pointer"
            >
              Retry Loading Services
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-lg border border-[#E5E1DA] bg-white p-10 text-center">
            <p className="font-display text-2xl font-semibold text-[#171412]">
              No matching treatments found
            </p>
            <p className="mt-2 text-sm text-[#635C56]">
              Try clearing your search term or switching back to all service categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('All');
                setSearchQuery('');
              }}
              className="mt-5 rounded-md border border-[#D5CFC6] bg-white px-5 py-2.5 text-xs font-medium text-[#171412] hover:bg-[#F2F0EC] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            id="gallery"
            data-testid="services-grid"
            className="mt-10 scroll-mt-24 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onSelectDetails={onSelectServiceDetails}
                onBook={onBookService}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
