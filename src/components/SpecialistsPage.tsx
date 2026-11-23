import { ArrowRight, Award } from 'lucide-react';
import type { Specialist } from '../types/parlour.ts';

interface SpecialistsPageProps {
  specialists: Specialist[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onBookWithSpecialist: (specialist: Specialist) => void;
}

export function SpecialistsPage({
  specialists,
  loading,
  error,
  onRetry,
  onBookWithSpecialist,
}: SpecialistsPageProps) {
  return (
    <section id="specialists" className="bg-[#FAF9F7] py-14 lg:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wider text-[#A67C52]">
            Artisans &amp; Aestheticians
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[#171412] sm:text-5xl text-balance">
            Master Specialists
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#635C56]">
            Every treatment at MS Cosmetics is performed one-on-one by a senior practitioner. Select
            your preferred specialist to reserve directly with their live studio calendar.
          </p>
        </div>

        {loading ? (
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-56 animate-pulse rounded-xl border border-[#E5E1DA] bg-[#F2F0EC]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-10 rounded-xl border border-[#E5E1DA] bg-white p-8 text-center">
            <p className="text-sm font-medium text-[#171412]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 rounded-md bg-[#3D1C2E] px-5 py-2.5 text-xs font-medium text-white cursor-pointer"
            >
              Retry Loading Specialists
            </button>
          </div>
        ) : (
          <div
            data-testid="specialists-grid"
            className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2"
          >
            {specialists.map((sp, idx) => (
              <article
                key={sp.id}
                data-testid={`specialist-card-${sp.id}`}
                className="flex flex-col justify-between rounded-xl border border-[#E5E1DA] bg-white p-7 transition-shadow duration-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-[#A67C52] tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#635C56] tabular-nums">
                      <Award className="h-3.5 w-3.5 text-[#A67C52]" aria-hidden="true" />
                      {sp.experienceYears} years experience
                    </span>
                  </div>

                  <h2 className="mt-3 font-display text-3xl font-semibold text-[#171412]">
                    {sp.name}
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-[#635C56]">
                    <span>{sp.role}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sp.specialty}</span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-[#635C56]">{sp.bio}</p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E5E1DA] pt-5">
                  <span className="text-xs text-[#635C56]">Private Suite Consultations</span>
                  <button
                    type="button"
                    onClick={() => onBookWithSpecialist(sp)}
                    className="inline-flex items-center gap-2 rounded-md bg-[#3D1C2E] px-4 py-2 text-xs font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-[#2B1220] cursor-pointer"
                  >
                    <span>Book with {sp.name.split(' ')[0]}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
