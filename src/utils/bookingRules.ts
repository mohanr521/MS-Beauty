import type {
  CreateAppointmentPayload,
  ServiceCategory,
  ServiceItem,
  SlotAvailability,
  ValidationErrors,
} from '../types/parlour.ts';

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'All',
  'Facial & Skin',
  'Bridal & Makeup',
  'Hair & Scalp',
  'Nail & Spa',
];

export const STUDIO_TIME_SLOTS: ReadonlyArray<{ time: string; label: string }> = [
  { time: '09:30', label: '9:30 AM' },
  { time: '10:30', label: '10:30 AM' },
  { time: '11:30', label: '11:30 AM' },
  { time: '13:00', label: '1:00 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '15:00', label: '3:00 PM' },
  { time: '16:00', label: '4:00 PM' },
  { time: '17:30', label: '5:30 PM' },
];

export function formatPrice(priceUsd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(priceUsd);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`;
}

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getBookableDates(
  daysCount = 14,
  baseDate: Date = new Date()
): Array<{ iso: string; dayLabel: string; dateLabel: string }> {
  const results: Array<{ iso: string; dayLabel: string; dateLabel: string }> = [];
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  for (let i = 0; i < daysCount; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const iso = toIsoDateString(current);
    const dayLabel =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : current.toLocaleDateString('en-US', { weekday: 'short' });
    const dateLabel = current.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    results.push({ iso, dayLabel, dateLabel });
  }

  return results;
}

export function formatBookingDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    return isoDate;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeLabel(time24: string): string {
  const found = STUDIO_TIME_SLOTS.find((slot) => slot.time === time24);
  if (found) {
    return found.label;
  }
  const match = /^(\d{2}):(\d{2})$/.exec(time24);
  if (!match) {
    return time24;
  }
  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

export function computeSlotAvailability(
  bookedTimes: string[],
  selectedDate: string,
  now: Date = new Date()
): SlotAvailability[] {
  const bookedSet = new Set(bookedTimes);
  const todayIso = toIsoDateString(now);
  const isToday = selectedDate === todayIso;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return STUDIO_TIME_SLOTS.map((slot) => {
    if (bookedSet.has(slot.time)) {
      return {
        time: slot.time,
        label: slot.label,
        available: false,
        reason: 'booked',
      };
    }

    if (isToday) {
      const [hStr, mStr] = slot.time.split(':');
      const slotMinutes = Number(hStr) * 60 + Number(mStr);
      // Require at least 30 minutes lead time for same-day booking
      if (slotMinutes <= currentMinutes + 30) {
        return {
          time: slot.time,
          label: slot.label,
          available: false,
          reason: 'past',
        };
      }
    }

    return {
      time: slot.time,
      label: slot.label,
      available: true,
    };
  });
}

export function filterServices(
  services: ServiceItem[],
  category: ServiceCategory,
  searchQuery: string
): ServiceItem[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return services.filter((service) => {
    const matchesCategory = category === 'All' || service.category === category;
    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      service.name,
      service.category,
      service.shortDescription,
      ...service.botanicals,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export const BLUEPRINT_CONSTRAINTS = {
  clientNameMin: 2,
  clientNameMax: 80,
  clientEmailMin: 5,
  clientEmailMax: 120,
  clientPhoneMin: 7,
  clientPhoneMax: 30,
  notesMax: 400,
  datePattern: /^\d{4}-\d{2}-\d{2}$/,
  timePattern: /^\d{2}:\d{2}$/,
  bookingRefPattern: /^MSC-[A-Z0-9]{4,10}$/,
} as const;

export function validateBookingInput(
  input: Partial<CreateAppointmentPayload>,
  referenceDate: Date = new Date()
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!input.serviceId || !Number.isInteger(input.serviceId) || input.serviceId <= 0) {
    errors.serviceId = 'Please select a beauty treatment.';
  }

  if (!input.specialistId || !Number.isInteger(input.specialistId) || input.specialistId <= 0) {
    errors.specialistId = 'Please choose a specialist.';
  }

  const name = (input.clientName ?? '').trim();
  if (name.length < BLUEPRINT_CONSTRAINTS.clientNameMin) {
    errors.clientName = 'Please enter your full name (at least 2 characters).';
  } else if (name.length > BLUEPRINT_CONSTRAINTS.clientNameMax) {
    errors.clientName = `Name must be ${BLUEPRINT_CONSTRAINTS.clientNameMax} characters or fewer.`;
  }

  const email = (input.clientEmail ?? '').trim();
  if (
    email.length > BLUEPRINT_CONSTRAINTS.clientEmailMax ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  ) {
    errors.clientEmail = 'Please enter a valid email address.';
  }

  const rawPhone = (input.clientPhone ?? '').trim();
  const phoneDigits = rawPhone.replace(/\D/g, '');
  if (
    rawPhone.length > BLUEPRINT_CONSTRAINTS.clientPhoneMax ||
    phoneDigits.length < BLUEPRINT_CONSTRAINTS.clientPhoneMin ||
    phoneDigits.length > 15
  ) {
    errors.clientPhone = 'Please enter a valid phone number (7–15 digits).';
  }

  const dateStr = (input.appointmentDate ?? '').trim();
  if (!BLUEPRINT_CONSTRAINTS.datePattern.test(dateStr)) {
    errors.appointmentDate = 'Please select a valid appointment date.';
  } else {
    const todayIso = toIsoDateString(referenceDate);
    if (dateStr < todayIso) {
      errors.appointmentDate = 'Appointment date cannot be in the past.';
    }
  }

  const timeStr = (input.appointmentTime ?? '').trim();
  const validSlot =
    BLUEPRINT_CONSTRAINTS.timePattern.test(timeStr) &&
    STUDIO_TIME_SLOTS.some((slot) => slot.time === timeStr);
  if (!validSlot) {
    errors.appointmentTime = 'Please select an available studio time slot.';
  }

  return errors;
}

export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function generateBookingRef(numericSequence: number): string {
  const padded = String(1000 + numericSequence);
  return `MSC-${padded}`;
}

export function generateRandomBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `MSC-${suffix}`;
}

export function buildSlotKey(
  specialistDocId: string,
  appointmentDate: string,
  appointmentTime: string
): string {
  const compactTime = appointmentTime.replace(':', '');
  return `${specialistDocId}_${appointmentDate}_${compactTime}`;
}

