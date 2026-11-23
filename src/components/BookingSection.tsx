import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { Calendar, CheckCircle2, Clock, LogIn, LogOut, User } from 'lucide-react';
import type {
  Appointment,
  ServiceItem,
  SlotAvailability,
  Specialist,
  ValidationErrors,
} from '../types/parlour.ts';
import {
  computeSlotAvailability,
  formatBookingDate,
  formatDuration,
  formatPrice,
  formatTimeLabel,
  getBookableDates,
  hasValidationErrors,
  toIsoDateString,
  validateBookingInput,
} from '../utils/bookingRules.ts';
import {
  createFirestoreAppointment,
  ensureCatalogSeeded,
  subscribeBookedTimes,
} from '../utils/firestoreService.ts';

interface BookingSectionProps {
  user: FirebaseUser | null;
  authReady: boolean;
  authError: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  catalogSynced: boolean;
  services: ServiceItem[];
  specialists: Specialist[];
  selectedServiceId: number;
  onChangeServiceId: (id: number) => void;
  selectedSpecialistId: number;
  onChangeSpecialistId: (id: number) => void;
  onAppointmentCreated: (appointment: Appointment) => void;
  onManageBooking: (bookingRef: string) => void;
}

export function BookingSection({
  user,
  authReady,
  authError,
  onSignIn,
  onSignOut,
  catalogSynced,
  services,
  specialists,
  selectedServiceId,
  onChangeServiceId,
  selectedSpecialistId,
  onChangeSpecialistId,
  onAppointmentCreated,
  onManageBooking,
}: BookingSectionProps) {
  const bookableDates = useMemo(() => getBookableDates(7), []);
  const minDateIso = useMemo(() => toIsoDateString(new Date()), []);

  const [selectedDate, setSelectedDate] = useState<string>(() => bookableDates[1]?.iso ?? minDateIso);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? services[0],
    [services, selectedServiceId]
  );

  const selectedSpecialist = useMemo(
    () => specialists.find((sp) => sp.id === selectedSpecialistId) ?? specialists[0],
    [specialists, selectedSpecialistId]
  );

  useEffect(() => {
    if (user) {
      setClientName((prev) => (prev.trim() ? prev : user.displayName ?? ''));
      setClientEmail((prev) => (prev.trim() ? prev : user.email ?? ''));
    }
  }, [user]);

  useEffect(() => {
    if (!selectedDate || !selectedSpecialist) {
      return;
    }

    const specialistDocId = selectedSpecialist.docId ?? `specialist-${selectedSpecialist.id}`;
    setSlotsLoading(true);
    setSlotsError(null);

    const unsubscribe = subscribeBookedTimes(
      selectedDate,
      specialistDocId,
      (times) => {
        setBookedTimes(times);
        setSlotsLoading(false);
      },
      (err) => {
        setSlotsError(err.message);
        setSlotsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedDate, selectedSpecialist]);

  const slots: SlotAvailability[] = useMemo(
    () => computeSlotAvailability(bookedTimes, selectedDate),
    [bookedTimes, selectedDate]
  );

  useEffect(() => {
    setSelectedTime((prev) => {
      if (slots.some((s) => s.time === prev && s.available)) {
        return prev;
      }
      const firstOpen = slots.find((s) => s.available);
      return firstOpen ? firstOpen.time : '';
    });
  }, [slots]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!user) {
      setSubmitError('Please sign in with Google above to confirm your reservation.');
      return;
    }

    if (!selectedService || !selectedSpecialist) {
      setSubmitError('Catalog is still loading. Please try again in a moment.');
      return;
    }

    const payload = {
      serviceId: selectedService.id,
      specialistId: selectedSpecialist.id,
      clientName,
      clientEmail,
      clientPhone,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime,
      notes,
    };

    const validation = validateBookingInput(payload);
    if (hasValidationErrors(validation)) {
      setFieldErrors(validation);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      if (!catalogSynced && user.email) {
        await ensureCatalogSeeded(user.email);
      }

      const appointment = await createFirestoreAppointment({
        userId: user.uid,
        service: selectedService,
        specialist: selectedSpecialist,
        clientName,
        clientEmail,
        clientPhone,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        notes,
      });

      setConfirmedAppointment(appointment);
      onAppointmentCreated(appointment);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Booking submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleResetForNewBooking() {
    setConfirmedAppointment(null);
    setClientPhone('');
    setNotes('');
    setFieldErrors({});
    setSubmitError(null);
  }

  return (
    <section id="booking" className="bg-[#F2F0EC] py-14 lg:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wider text-[#A67C52]">
              Online Reservation System
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[#171412] sm:text-5xl text-balance">
              Reserve Your Appointment
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#635C56]">
              Select your treatment, specialist, and an open studio slot. Reservations sync live to
              our Cloud Firestore schedule.
            </p>
          </div>

          {authReady && (
            <div className="rounded-lg border border-[#E5E1DA] bg-white px-4 py-3">
              {user ? (
                <div className="flex items-center gap-4">
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
              ) : (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-2 rounded-md bg-[#3D1C2E] px-4 py-2 text-xs font-medium text-white hover:bg-[#2B1220] cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          )}
        </div>

        {authError && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-[#9B1C1C]/25 bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-[#9B1C1C]"
          >
            {authError}
          </p>
        )}

        {confirmedAppointment ? (
          <div
            data-testid="booking-confirmation"
            className="mt-10 rounded-xl border border-[#E5E1DA] bg-white p-8 shadow-sm sm:p-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E1DA] pb-6">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#1E5631]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Confirmed Appointment</span>
                </div>
                <h2 className="mt-2 font-display text-3xl font-semibold text-[#171412]">
                  We look forward to welcoming you, {confirmedAppointment.clientName}.
                </h2>
              </div>

              <div className="rounded-md border border-[#E5E1DA] bg-[#FAF9F7] px-4 py-3 text-right">
                <p className="text-xs text-[#635C56]">Booking Reference</p>
                <p
                  data-testid="confirmed-booking-ref"
                  className="mt-0.5 text-lg font-semibold text-[#3D1C2E] tabular-nums"
                >
                  {confirmedAppointment.bookingRef}
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-[#635C56]">Treatment</dt>
                <dd className="mt-1 text-sm font-semibold text-[#171412]">
                  {confirmedAppointment.serviceName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#635C56]">Specialist</dt>
                <dd className="mt-1 text-sm font-semibold text-[#171412]">
                  {confirmedAppointment.specialistName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#635C56]">Date &amp; Time</dt>
                <dd className="mt-1 text-sm font-semibold text-[#171412] tabular-nums">
                  {formatBookingDate(confirmedAppointment.appointmentDate)} ·{' '}
                  {formatTimeLabel(confirmedAppointment.appointmentTime)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#635C56]">Session Fee</dt>
                <dd className="mt-1 text-sm font-semibold text-[#171412] tabular-nums">
                  {formatPrice(confirmedAppointment.priceUsd)} (
                  {formatDuration(confirmedAppointment.durationMinutes)})
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#E5E1DA] pt-6">
              <button
                type="button"
                onClick={() => onManageBooking(confirmedAppointment.bookingRef)}
                className="rounded-md bg-[#3D1C2E] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2B1220] cursor-pointer"
              >
                Manage This Booking
              </button>
              <button
                type="button"
                onClick={handleResetForNewBooking}
                className="rounded-md border border-[#D5CFC6] bg-white px-6 py-3 text-sm font-medium text-[#171412] transition-colors hover:bg-[#F2F0EC] cursor-pointer"
              >
                Book Another Session
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left 7 columns: Treatment, Specialist, Date & Live Time Slots */}
            <div className="space-y-8 rounded-xl border border-[#E5E1DA] bg-white p-6 sm:p-8 lg:col-span-7">
              {/* Step 1: Service */}
              <div>
                <label
                  htmlFor="booking-service-select"
                  className="block text-xs font-semibold tracking-wide text-[#171412]"
                >
                  01. Select Treatment
                </label>
                <select
                  id="booking-service-select"
                  value={selectedServiceId}
                  onChange={(e) => {
                    const nextId = Number(e.target.value);
                    onChangeServiceId(nextId);
                    const svc = services.find((item) => item.id === nextId);
                    if (svc) {
                      const matchingSpec = specialists.find((sp) => sp.specialty === svc.category);
                      if (matchingSpec) {
                        onChangeSpecialistId(matchingSpec.id);
                      }
                    }
                  }}
                  className="mt-2 w-full rounded-md border border-[#D5CFC6] bg-[#FAF9F7] px-4 py-3 text-sm font-medium text-[#171412] focus:border-[#3D1C2E] focus:outline-none"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {formatDuration(service.durationMinutes)} ·{' '}
                      {formatPrice(service.priceUsd)}
                    </option>
                  ))}
                </select>
                {fieldErrors.serviceId && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-[#9B1C1C]">
                    {fieldErrors.serviceId}
                  </p>
                )}
              </div>

              {/* Step 2: Specialist */}
              <div>
                <span className="block text-xs font-semibold tracking-wide text-[#171412]">
                  02. Choose Specialist
                </span>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {specialists.map((sp) => {
                    const selected = sp.id === selectedSpecialistId;
                    const recommended = selectedService?.category === sp.specialty;
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChangeSpecialistId(sp.id)}
                        className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors duration-150 cursor-pointer ${
                          selected
                            ? 'border-[#3D1C2E] bg-[#FAF9F7]'
                            : 'border-[#E5E1DA] bg-white hover:border-[#B8AEA2]'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#171412]">{sp.name}</span>
                          {recommended && (
                            <span className="text-[11px] font-medium text-[#A67C52]">
                              Recommended
                            </span>
                          )}
                        </div>
                        <span className="mt-0.5 text-xs text-[#635C56]">{sp.role}</span>
                        <span className="mt-2 text-xs text-[#8E857D] tabular-nums">
                          {sp.specialty} · {sp.experienceYears} yrs experience
                        </span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.specialistId && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-[#9B1C1C]">
                    {fieldErrors.specialistId}
                  </p>
                )}
              </div>

              {/* Step 3: Date & Live Slots */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold tracking-wide text-[#171412]">
                    03. Select Date &amp; Available Time
                  </span>

                  <div className="flex items-center gap-2">
                    <label htmlFor="booking-custom-date" className="text-xs text-[#635C56]">
                      Other date:
                    </label>
                    <input
                      id="booking-custom-date"
                      type="date"
                      min={minDateIso}
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                        }
                      }}
                      className="rounded-md border border-[#D5CFC6] bg-[#FAF9F7] px-2.5 py-1.5 text-xs text-[#171412] tabular-nums"
                    />
                  </div>
                </div>

                {/* Quick 7-day strip */}
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {bookableDates.map((d) => {
                    const active = d.iso === selectedDate;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedDate(d.iso)}
                        className={`flex flex-col items-center rounded-md border px-2 py-2.5 text-center transition-colors duration-150 cursor-pointer ${
                          active
                            ? 'border-[#3D1C2E] bg-[#3D1C2E] text-white'
                            : 'border-[#E5E1DA] bg-[#FAF9F7] text-[#171412] hover:border-[#B8AEA2]'
                        }`}
                      >
                        <span
                          className={`text-[11px] ${active ? 'text-white/80' : 'text-[#635C56]'}`}
                        >
                          {d.dayLabel}
                        </span>
                        <span className="mt-0.5 text-xs font-semibold tabular-nums">
                          {d.dateLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.appointmentDate && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-[#9B1C1C]">
                    {fieldErrors.appointmentDate}
                  </p>
                )}

                {/* Time Slots */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-[#635C56]">
                    <span>
                      Open times with{' '}
                      <strong className="font-medium text-[#171412]">
                        {selectedSpecialist?.name ?? 'specialist'}
                      </strong>{' '}
                      on {formatBookingDate(selectedDate)}
                    </span>
                  </div>

                  {slotsLoading ? (
                    <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <div
                          key={n}
                          className="h-11 animate-pulse rounded-md border border-[#E5E1DA] bg-[#F2F0EC]"
                        />
                      ))}
                    </div>
                  ) : slotsError ? (
                    <p role="alert" className="mt-3 text-xs font-medium text-[#9B1C1C]">
                      {slotsError}
                    </p>
                  ) : (
                    <div
                      data-testid="time-slots-grid"
                      className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                    >
                      {slots.map((slot) => {
                        const active = selectedTime === slot.time && slot.available;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            aria-pressed={active}
                            onClick={() => {
                              setSelectedTime(slot.time);
                              setFieldErrors((prev) => ({ ...prev, appointmentTime: undefined }));
                            }}
                            className={`flex flex-col items-center justify-center rounded-md border px-3 py-2.5 text-xs font-medium tabular-nums transition-colors duration-150 ${
                              !slot.available
                                ? 'cursor-not-allowed border-[#E5E1DA] bg-[#F2F0EC] text-[#9A9189] line-through'
                                : active
                                  ? 'cursor-pointer border-[#3D1C2E] bg-[#3D1C2E] text-white'
                                  : 'cursor-pointer border-[#D5CFC6] bg-white text-[#171412] hover:border-[#3D1C2E]'
                            }`}
                          >
                            <span>{slot.label}</span>
                            {!slot.available && (
                              <span className="mt-0.5 text-[10px] font-normal no-underline">
                                {slot.reason === 'booked' ? 'Booked' : 'Passed'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {fieldErrors.appointmentTime && (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-[#9B1C1C]">
                      {fieldErrors.appointmentTime}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right 5 columns: Summary + Client Details */}
            <div className="flex flex-col justify-between rounded-xl border border-[#E5E1DA] bg-white p-6 sm:p-8 lg:col-span-5">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#171412]">
                  Your Session Details
                </h2>

                {selectedService && (
                  <div className="mt-4 space-y-2 border-b border-[#E5E1DA] pb-5 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-semibold text-[#171412]">{selectedService.name}</span>
                      <span className="font-semibold text-[#171412] tabular-nums">
                        {formatPrice(selectedService.priceUsd)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#635C56]">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                        {selectedSpecialist?.name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDuration(selectedService.durationMinutes)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatBookingDate(selectedDate)}
                        {selectedTime ? `, ${formatTimeLabel(selectedTime)}` : ''}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="client-name-input"
                      className="block text-xs font-medium text-[#171412]"
                    >
                      Full Name
                    </label>
                    <input
                      id="client-name-input"
                      type="text"
                      maxLength={80}
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, clientName: undefined }));
                      }}
                      placeholder="Elena Rostova"
                      className="mt-1.5 w-full rounded-md border border-[#D5CFC6] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#171412] placeholder:text-[#8E857D] focus:border-[#3D1C2E] focus:outline-none"
                    />
                    {fieldErrors.clientName && (
                      <p role="alert" className="mt-1 text-xs font-medium text-[#9B1C1C]">
                        {fieldErrors.clientName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="client-email-input"
                      className="block text-xs font-medium text-[#171412]"
                    >
                      Email Address
                    </label>
                    <input
                      id="client-email-input"
                      type="email"
                      maxLength={120}
                      value={clientEmail}
                      onChange={(e) => {
                        setClientEmail(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, clientEmail: undefined }));
                      }}
                      placeholder="elena@example.com"
                      className="mt-1.5 w-full rounded-md border border-[#D5CFC6] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#171412] placeholder:text-[#8E857D] focus:border-[#3D1C2E] focus:outline-none"
                    />
                    {fieldErrors.clientEmail && (
                      <p role="alert" className="mt-1 text-xs font-medium text-[#9B1C1C]">
                        {fieldErrors.clientEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="client-phone-input"
                      className="block text-xs font-medium text-[#171412]"
                    >
                      Phone Number
                    </label>
                    <input
                      id="client-phone-input"
                      type="tel"
                      maxLength={30}
                      value={clientPhone}
                      onChange={(e) => {
                        setClientPhone(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, clientPhone: undefined }));
                      }}
                      placeholder="+1 (415) 555-0192"
                      className="mt-1.5 w-full rounded-md border border-[#D5CFC6] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#171412] placeholder:text-[#8E857D] focus:border-[#3D1C2E] focus:outline-none"
                    />
                    {fieldErrors.clientPhone && (
                      <p role="alert" className="mt-1 text-xs font-medium text-[#9B1C1C]">
                        {fieldErrors.clientPhone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="client-notes-input"
                      className="block text-xs font-medium text-[#171412]"
                    >
                      Skin Sensitivities or Styling Notes (Optional)
                    </label>
                    <textarea
                      id="client-notes-input"
                      rows={3}
                      maxLength={400}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any ingredient preferences, bridal veil fitting, or comfort notes..."
                      className="mt-1.5 w-full rounded-md border border-[#D5CFC6] bg-[#FAF9F7] px-3.5 py-2.5 text-sm text-[#171412] placeholder:text-[#8E857D] focus:border-[#3D1C2E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {submitError && (
                  <p
                    role="alert"
                    className="mb-3 rounded-md border border-[#9B1C1C]/25 bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-medium text-[#9B1C1C]"
                  >
                    {submitError}
                  </p>
                )}

                {authReady && !user ? (
                  <div className="space-y-3 rounded-lg border border-[#E5E1DA] bg-[#FAF9F7] p-4">
                    <p className="text-xs leading-relaxed text-[#635C56]">
                      Sign in with Google to save your appointment securely to your account and
                      manage changes online.
                    </p>
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#3D1C2E] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2B1220] cursor-pointer"
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      <span>Sign in with Google to Book</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || !authReady}
                    className="w-full rounded-md bg-[#3D1C2E] px-6 py-3.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#2B1220] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? 'Confirming Reservation...' : 'Confirm Appointment'}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
