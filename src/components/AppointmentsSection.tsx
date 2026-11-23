import { useEffect, useMemo, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { Calendar, CheckCircle2, Clock, LogIn, LogOut, Search, XCircle } from 'lucide-react';
import type { Appointment, SlotAvailability, Specialist } from '../types/parlour.ts';
import {
  computeSlotAvailability,
  formatBookingDate,
  formatDuration,
  formatPrice,
  formatTimeLabel,
  getBookableDates,
} from '../utils/bookingRules.ts';
import {
  cancelFirestoreAppointment,
  rescheduleFirestoreAppointment,
  subscribeAdminAppointments,
  subscribeBookedTimes,
  subscribeUserAppointments,
  updateAppointmentStatusByAdmin,
} from '../utils/firestoreService.ts';

interface AppointmentsSectionProps {
  user: FirebaseUser | null;
  authReady: boolean;
  authError: string | null;
  isAdmin: boolean;
  specialists: Specialist[];
  onSignIn: () => void;
  onSignOut: () => void;
  activeLookupQuery: string;
}

export function AppointmentsSection({
  user,
  authReady,
  authError,
  isAdmin,
  specialists,
  onSignIn,
  onSignOut,
  activeLookupQuery,
}: AppointmentsSectionProps) {
  const [viewMode, setViewMode] = useState<'mine' | 'studio'>('mine');
  const [filterInput, setFilterInput] = useState(activeLookupQuery);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Inline reschedule state
  const [rescheduleRef, setRescheduleRef] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBookedTimes, setRescheduleBookedTimes] = useState<string[]>([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Inline cancel confirmation state
  const [cancelRef, setCancelRef] = useState<string | null>(null);

  const bookableDates = useMemo(() => getBookableDates(7), []);

  useEffect(() => {
    if (activeLookupQuery) {
      setFilterInput(activeLookupQuery);
    }
  }, [activeLookupQuery]);

  // Attach Firestore listener ONLY after auth is ready and user is authenticated
  useEffect(() => {
    if (!authReady || !user) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const useAdminFeed = isAdmin && viewMode === 'studio';
    const unsubscribe = useAdminFeed
      ? subscribeAdminAppointments(
          (items) => {
            setAppointments(items);
            setLoading(false);
          },
          (err) => {
            setLoadError(err.message);
            setLoading(false);
          }
        )
      : subscribeUserAppointments(
          user.uid,
          (items) => {
            setAppointments(items);
            setLoading(false);
          },
          (err) => {
            setLoadError(err.message);
            setLoading(false);
          }
        );

    return () => unsubscribe();
  }, [authReady, user, isAdmin, viewMode]);

  // Load live booked times when rescheduling a specific booking
  useEffect(() => {
    if (!rescheduleRef || !rescheduleDate) {
      return;
    }
    const target = appointments.find((a) => a.bookingRef === rescheduleRef);
    if (!target) {
      return;
    }

    const specialistDocId = target.specialistDocId ?? `specialist-${target.specialistId}`;
    setRescheduleLoadingSlots(true);

    const unsubscribe = subscribeBookedTimes(
      rescheduleDate,
      specialistDocId,
      (times) => {
        setRescheduleBookedTimes(times);
        setRescheduleLoadingSlots(false);
      },
      () => {
        setRescheduleBookedTimes([]);
        setRescheduleLoadingSlots(false);
      }
    );

    return () => unsubscribe();
  }, [rescheduleRef, rescheduleDate, appointments]);

  const rescheduleSlots: SlotAvailability[] = useMemo(() => {
    if (!rescheduleDate) {
      return [];
    }
    return computeSlotAvailability(rescheduleBookedTimes, rescheduleDate);
  }, [rescheduleBookedTimes, rescheduleDate]);

  useEffect(() => {
    if (!rescheduleRef) {
      return;
    }
    const firstOpen = rescheduleSlots.find((s) => s.available);
    setRescheduleTime((prev) =>
      rescheduleSlots.some((s) => s.time === prev && s.available) ? prev : firstOpen?.time ?? ''
    );
  }, [rescheduleRef, rescheduleSlots]);

  const filteredAppointments = useMemo(() => {
    const q = filterInput.trim().toLowerCase();
    if (!q) {
      return appointments;
    }
    return appointments.filter(
      (a) =>
        a.bookingRef.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q) ||
        a.specialistName.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q) ||
        a.clientEmail.toLowerCase().includes(q)
    );
  }, [appointments, filterInput]);

  function startReschedule(appt: Appointment) {
    setCancelRef(null);
    setActionError(null);
    setRescheduleRef(appt.bookingRef);
    setRescheduleDate(appt.appointmentDate);
    setRescheduleTime('');
  }

  function startCancel(appt: Appointment) {
    setRescheduleRef(null);
    setActionError(null);
    setCancelRef(appt.bookingRef);
  }

  async function submitReschedule(appt: Appointment) {
    if (!user) {
      return;
    }
    setActionError(null);
    if (!rescheduleDate || !rescheduleTime) {
      setActionError('Please choose an available date and time slot.');
      return;
    }

    const specialist =
      specialists.find(
        (sp) => sp.docId === appt.specialistDocId || sp.id === appt.specialistId
      ) ?? specialists[0];
    if (!specialist) {
      setActionError('Specialist details are unavailable.');
      return;
    }

    setActionBusy(true);
    try {
      await rescheduleFirestoreAppointment({
        appointment: appt,
        userId: user.uid,
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        specialist,
      });
      setRescheduleRef(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Reschedule failed.');
    } finally {
      setActionBusy(false);
    }
  }

  async function submitCancel(appt: Appointment) {
    setActionError(null);
    setActionBusy(true);
    try {
      await cancelFirestoreAppointment(appt);
      setCancelRef(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Cancellation failed.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleAdminComplete(appt: Appointment) {
    setActionError(null);
    setActionBusy(true);
    try {
      await updateAppointmentStatusByAdmin(appt, 'completed');
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <section id="appointments" className="bg-[#FAF9F7] py-14 lg:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-wider text-[#A67C52]">
              Client Reservation Portal
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[#171412] sm:text-5xl text-balance">
              Manage Your Bookings
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#635C56]">
              Sign in with Google to view your real-time Firestore reservations, reschedule open
              studio slots, or cancel an upcoming visit.
            </p>

            {authReady && user ? (
              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E5E1DA] bg-white px-4 py-3">
                  <div className="text-xs">
                    <p className="font-semibold text-[#171412]">
                      {user.displayName ?? 'Verified Client'}
                    </p>
                    <p className="text-[#635C56]">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#D5CFC6] px-3 py-1.5 text-xs font-medium text-[#171412] hover:bg-[#F2F0EC] cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>

                {isAdmin && (
                  <div
                    role="tablist"
                    aria-label="Reservation view mode"
                    className="flex items-center gap-1.5 rounded-lg border border-[#E5E1DA] bg-[#F2F0EC] p-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'mine'}
                      onClick={() => setViewMode('mine')}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium cursor-pointer ${
                        viewMode === 'mine'
                          ? 'bg-white text-[#171412] shadow-xs'
                          : 'text-[#635C56] hover:text-[#171412]'
                      }`}
                    >
                      My Bookings
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'studio'}
                      onClick={() => setViewMode('studio')}
                      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium cursor-pointer ${
                        viewMode === 'studio'
                          ? 'bg-white text-[#171412] shadow-xs'
                          : 'text-[#635C56] hover:text-[#171412]'
                      }`}
                    >
                      Studio Schedule (Admin)
                    </button>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="booking-lookup-input"
                    className="block text-xs font-medium text-[#171412]"
                  >
                    Filter Reservations
                  </label>
                  <div className="relative mt-1.5">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#635C56]"
                      aria-hidden="true"
                    />
                    <input
                      id="booking-lookup-input"
                      type="search"
                      value={filterInput}
                      onChange={(e) => setFilterInput(e.target.value)}
                      placeholder="Filter by reference, treatment, or specialist..."
                      className="w-full rounded-md border border-[#D5CFC6] bg-white py-2.5 pr-3.5 pl-10 text-sm text-[#171412] placeholder:text-[#8E857D] focus:border-[#3D1C2E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-[#E5E1DA] bg-white p-6">
                <p className="text-sm font-medium text-[#171412]">
                  Client sign-in protects your booking details
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#635C56]">
                  Contact information and appointment notes are private to your account. Sign in
                  with Google to load your bookings from Cloud Firestore.
                </p>
                <button
                  type="button"
                  disabled={!authReady}
                  onClick={onSignIn}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#3D1C2E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2B1220] disabled:opacity-60 cursor-pointer"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}

            {authError && (
              <p role="alert" className="mt-3 text-xs font-medium text-[#9B1C1C]">
                {authError}
              </p>
            )}
          </div>

          <div className="lg:col-span-7">
            {!authReady || loading ? (
              <div className="h-56 animate-pulse rounded-xl border border-[#E5E1DA] bg-[#F2F0EC]" />
            ) : !user ? (
              <div className="flex h-full min-h-[240px] flex-col justify-center rounded-xl border border-[#E5E1DA] bg-white p-8">
                <p className="font-display text-2xl font-semibold text-[#171412]">
                  Your appointments sync in real time
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#635C56]">
                  Once signed in, all confirmed, rescheduled, and past studio bookings linked to
                  your Google account appear here automatically.
                </p>
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-[#E5E1DA] bg-white p-8">
                <p role="alert" className="text-sm font-medium text-[#9B1C1C]">
                  Unable to load bookings right now.
                </p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="rounded-xl border border-[#E5E1DA] bg-white p-8">
                <p className="font-display text-2xl font-semibold text-[#171412]">
                  {appointments.length === 0
                    ? 'No appointments booked yet'
                    : 'No matching appointments found'}
                </p>
                <p className="mt-2 text-sm text-[#635C56]">
                  {appointments.length === 0
                    ? 'Visit Book Online to reserve your first facial, bridal, hair, or spa session.'
                    : 'Try clearing the filter text to view all your reservations.'}
                </p>
              </div>
            ) : (
              <div data-testid="lookup-results" className="space-y-4">
                {filteredAppointments.map((appt) => {
                  const isCancelled = appt.status === 'cancelled';
                  const isCompleted = appt.status === 'completed';
                  const isConfirmed = appt.status === 'confirmed';
                  const isRescheduling = rescheduleRef === appt.bookingRef;
                  const isCancelling = cancelRef === appt.bookingRef;
                  const isOwner = appt.userId === user.uid;

                  return (
                    <article
                      key={appt.docId ?? appt.bookingRef}
                      data-testid={`appointment-card-${appt.bookingRef}`}
                      className="rounded-xl border border-[#E5E1DA] bg-white p-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1DA] pb-4">
                        <div>
                          <div className="flex items-center gap-2.5 text-xs">
                            <span className="font-semibold text-[#3D1C2E] tabular-nums">
                              {appt.bookingRef}
                            </span>
                            <span aria-hidden="true" className="text-[#8E857D]">
                              ·
                            </span>
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 font-medium text-[#9B1C1C]">
                                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                                Cancelled
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center gap-1 font-medium text-[#635C56]">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-[#1E5631]">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Confirmed
                              </span>
                            )}
                          </div>
                          <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#171412]">
                            {appt.serviceName}
                          </h2>
                          <p className="text-xs text-[#635C56]">
                            With {appt.specialistName} ({appt.specialistRole})
                            {viewMode === 'studio' && ` · Client: ${appt.clientName}`}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-semibold text-[#171412] tabular-nums">
                            {formatPrice(appt.priceUsd)}
                          </p>
                          <p className="text-xs text-[#635C56] tabular-nums">
                            {formatDuration(appt.durationMinutes)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm">
                        <div className="flex flex-wrap items-center gap-4 text-[#171412]">
                          <span className="inline-flex items-center gap-1.5 tabular-nums">
                            <Calendar className="h-4 w-4 text-[#A67C52]" aria-hidden="true" />
                            {formatBookingDate(appt.appointmentDate)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 tabular-nums">
                            <Clock className="h-4 w-4 text-[#A67C52]" aria-hidden="true" />
                            {formatTimeLabel(appt.appointmentTime)}
                          </span>
                        </div>

                        {isConfirmed && (
                          <div className="flex flex-wrap items-center gap-2">
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => startReschedule(appt)}
                                className="rounded-md border border-[#D5CFC6] bg-white px-3.5 py-2 text-xs font-medium text-[#171412] transition-colors hover:bg-[#F2F0EC] cursor-pointer"
                              >
                                Reschedule
                              </button>
                            )}
                            {isAdmin && viewMode === 'studio' && (
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={() => void handleAdminComplete(appt)}
                                className="rounded-md border border-[#1E5631]/40 bg-white px-3.5 py-2 text-xs font-medium text-[#1E5631] transition-colors hover:bg-[#F0FDF4] cursor-pointer"
                              >
                                Mark Completed
                              </button>
                            )}
                            {isOwner && (
                              <button
                                type="button"
                                onClick={() => startCancel(appt)}
                                className="rounded-md border border-[#9B1C1C]/30 bg-white px-3.5 py-2 text-xs font-medium text-[#9B1C1C] transition-colors hover:bg-[#FEF2F2] cursor-pointer"
                              >
                                Cancel Appointment
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {appt.notes && (
                        <p className="mt-3 text-xs text-[#635C56]">
                          <span className="font-medium text-[#171412]">Notes:</span> {appt.notes}
                        </p>
                      )}

                      {/* Reschedule inline panel */}
                      {isRescheduling && (
                        <div className="mt-5 border-t border-[#E5E1DA] pt-5">
                          <p className="text-xs font-semibold text-[#171412]">
                            Choose a new date and open time slot
                          </p>

                          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {bookableDates.map((d) => {
                              const active = d.iso === rescheduleDate;
                              return (
                                <button
                                  key={d.iso}
                                  type="button"
                                  onClick={() => setRescheduleDate(d.iso)}
                                  className={`rounded-md border px-2 py-2 text-center text-xs transition-colors cursor-pointer ${
                                    active
                                      ? 'border-[#3D1C2E] bg-[#3D1C2E] text-white'
                                      : 'border-[#E5E1DA] bg-[#FAF9F7] text-[#171412]'
                                  }`}
                                >
                                  <span className="block text-[10px] opacity-80">{d.dayLabel}</span>
                                  <span className="font-semibold tabular-nums">{d.dateLabel}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-3">
                            {rescheduleLoadingSlots ? (
                              <p className="text-xs text-[#635C56]">Checking open times...</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {rescheduleSlots.map((slot) => (
                                  <button
                                    key={slot.time}
                                    type="button"
                                    disabled={!slot.available}
                                    onClick={() => setRescheduleTime(slot.time)}
                                    className={`rounded-md border px-2.5 py-2 text-xs font-medium tabular-nums ${
                                      !slot.available
                                        ? 'cursor-not-allowed border-[#E5E1DA] bg-[#F2F0EC] text-[#9A9189] line-through'
                                        : rescheduleTime === slot.time
                                          ? 'cursor-pointer border-[#3D1C2E] bg-[#3D1C2E] text-white'
                                          : 'cursor-pointer border-[#D5CFC6] bg-white text-[#171412]'
                                    }`}
                                  >
                                    {slot.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {actionError && (
                            <p role="alert" className="mt-2 text-xs font-medium text-[#9B1C1C]">
                              {actionError}
                            </p>
                          )}

                          <div className="mt-4 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => void submitReschedule(appt)}
                              className="rounded-md bg-[#3D1C2E] px-4 py-2 text-xs font-medium text-white cursor-pointer disabled:opacity-60"
                            >
                              {actionBusy ? 'Saving...' : 'Save New Time'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRescheduleRef(null)}
                              className="rounded-md border border-[#D5CFC6] bg-white px-4 py-2 text-xs font-medium text-[#171412] cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cancel confirmation inline panel */}
                      {isCancelling && (
                        <div className="mt-5 border-t border-[#E5E1DA] pt-5">
                          <p className="text-xs font-semibold text-[#9B1C1C]">
                            Confirm appointment cancellation
                          </p>
                          <p className="mt-1 text-xs text-[#635C56]">
                            Cancelling immediately releases this time slot in the studio schedule.
                          </p>
                          {actionError && (
                            <p role="alert" className="mt-2 text-xs font-medium text-[#9B1C1C]">
                              {actionError}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => void submitCancel(appt)}
                              className="rounded-md bg-[#9B1C1C] px-4 py-2 text-xs font-medium text-white cursor-pointer disabled:opacity-60"
                            >
                              {actionBusy ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelRef(null)}
                              className="rounded-md border border-[#D5CFC6] bg-white px-4 py-2 text-xs font-medium text-[#171412] cursor-pointer"
                            >
                              Keep Appointment
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
