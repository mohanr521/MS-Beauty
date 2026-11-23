import { useEffect, useState } from 'react';
import { Calendar, Clock, Sparkles, X } from 'lucide-react';
import type { ServiceItem } from '../types/parlour.ts';
import { formatDuration, formatPrice } from '../utils/bookingRules.ts';

interface ServiceDetailModalProps {
  service: ServiceItem | null;
  onClose: () => void;
  onBookService: (service: ServiceItem) => void;
}

export function ServiceDetailModal({ service, onClose, onBookService }: ServiceDetailModalProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [service?.id]);

  useEffect(() => {
    if (!service) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [service, onClose]);

  if (!service) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#171412]/55 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#E5E1DA] bg-[#FAF9F7] shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${service.name} details`}
          className="absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E1DA] bg-white text-[#171412] transition-colors hover:bg-[#F2F0EC] cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 bg-[#F2F0EC]">
            {!imgFailed ? (
              <img
                src={service.imageUrl}
                alt={service.name}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="h-64 w-full object-cover md:h-full"
              />
            ) : (
              <div className="flex h-64 w-full flex-col items-center justify-center p-6 text-center md:h-full">
                <Sparkles className="h-7 w-7 text-[#3D1C2E]" aria-hidden="true" />
                <p className="mt-2 font-display text-lg font-semibold text-[#171412]">
                  {service.name}
                </p>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 md:col-span-7">
            <div className="flex items-center gap-2 text-xs font-medium text-[#635C56]">
              <span>{service.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDuration(service.durationMinutes)}
              </span>
            </div>

            <h2
              id="service-modal-title"
              className="mt-2 font-display text-3xl font-semibold text-[#171412]"
            >
              {service.name}
            </h2>

            <p className="mt-2 text-xl font-semibold text-[#3D1C2E] tabular-nums">
              {formatPrice(service.priceUsd)}
            </p>

            <p className="mt-4 text-sm leading-relaxed text-[#635C56]">{service.fullDescription}</p>

            <div className="mt-6 border-t border-[#E5E1DA] pt-5">
              <h3 className="text-xs font-semibold tracking-wide text-[#171412]">
                Treatment Sequence
              </h3>
              <ol className="mt-3 space-y-2">
                {service.ritualSteps.map((step, idx) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-[#171412]">
                    <span className="font-medium text-[#A67C52] tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-5 border-t border-[#E5E1DA] pt-4">
              <p className="text-xs text-[#635C56]">
                <span className="font-semibold text-[#171412]">Key Botanicals:</span>{' '}
                {service.botanicals.join(' · ')}
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onBookService(service)}
                className="inline-flex items-center gap-2 rounded-md bg-[#3D1C2E] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2B1220] cursor-pointer"
              >
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>Book This Ritual</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[#D5CFC6] bg-white px-5 py-3 text-sm font-medium text-[#171412] transition-colors hover:bg-[#F2F0EC] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
