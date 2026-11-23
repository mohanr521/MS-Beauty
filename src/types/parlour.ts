export type ServiceCategory =
  | 'All'
  | 'Facial & Skin'
  | 'Bridal & Makeup'
  | 'Hair & Scalp'
  | 'Nail & Spa';

export interface ServiceItem {
  id: number;
  docId?: string;
  slug: string;
  name: string;
  category: Exclude<ServiceCategory, 'All'>;
  durationMinutes: number;
  priceUsd: number;
  shortDescription: string;
  fullDescription: string;
  ritualSteps: string[];
  botanicals: string[];
  imageUrl: string;
  featured: boolean;
}

export interface Specialist {
  id: number;
  docId?: string;
  name: string;
  role: string;
  specialty: Exclude<ServiceCategory, 'All'>;
  experienceYears: number;
  bio: string;
}

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: number | string;
  docId?: string;
  userId?: string;
  bookingRef: string;
  serviceId: number;
  serviceDocId?: string;
  serviceName: string;
  serviceCategory: string;
  durationMinutes: number;
  priceUsd: number;
  specialistId: number;
  specialistDocId?: string;
  specialistName: string;
  specialistRole: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface CreateAppointmentPayload {
  serviceId: number;
  specialistId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

export interface ReschedulePayload {
  clientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  specialistId?: number;
  notes?: string;
}

export interface ValidationErrors {
  serviceId?: string;
  specialistId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

export interface SlotAvailability {
  time: string;
  label: string;
  available: boolean;
  reason?: 'booked' | 'past';
}
