import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Timestamp, Unsubscribe } from 'firebase/firestore';
import { SEED_SERVICES, SEED_SPECIALISTS } from '../data/seedCatalog.ts';
import { ADMIN_EMAIL, db } from '../firebase.ts';
import type { Appointment, AppointmentStatus, ServiceItem, Specialist } from '../types/parlour.ts';
import {
  BLUEPRINT_CONSTRAINTS,
  buildSlotKey,
  generateRandomBookingRef,
} from './bookingRules.ts';
import { handleFirestoreError, OperationType } from './firestoreErrors.ts';

function timestampToIso(ts: unknown): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

let seedingPromise: Promise<void> | null = null;

export async function ensureCatalogSeeded(userEmail: string | null | undefined): Promise<void> {
  if (!userEmail || userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return;
  }

  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    try {
      const [svcSnap, spSnap] = await Promise.all([
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'specialists')),
      ]);

      if (!svcSnap.empty && !spSnap.empty) {
        return;
      }

      const batch = writeBatch(db);

      if (svcSnap.empty) {
        for (const svc of SEED_SERVICES) {
          const ref = doc(db, 'services', svc.docId ?? svc.slug);
          batch.set(ref, {
            id: svc.id,
            slug: svc.slug,
            name: svc.name,
            category: svc.category,
            durationMinutes: svc.durationMinutes,
            priceUsd: svc.priceUsd,
            shortDescription: svc.shortDescription,
            fullDescription: svc.fullDescription,
            ritualSteps: svc.ritualSteps,
            botanicals: svc.botanicals,
            imageUrl: svc.imageUrl,
            featured: svc.featured,
          });
        }
      }

      if (spSnap.empty) {
        for (const sp of SEED_SPECIALISTS) {
          const ref = doc(db, 'specialists', sp.docId ?? `specialist-${sp.id}`);
          batch.set(ref, {
            id: sp.id,
            name: sp.name,
            role: sp.role,
            specialty: sp.specialty,
            experienceYears: sp.experienceYears,
            bio: sp.bio,
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'services');
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

export function subscribeServices(
  onData: (services: ServiceItem[], syncedInFirestore: boolean) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'services';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) {
        onData(SEED_SERVICES, false);
        return;
      }

      const items: ServiceItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: Number(data.id),
          docId: d.id,
          slug: String(data.slug),
          name: String(data.name),
          category: data.category as ServiceItem['category'],
          durationMinutes: Number(data.durationMinutes),
          priceUsd: Number(data.priceUsd),
          shortDescription: String(data.shortDescription),
          fullDescription: String(data.fullDescription),
          ritualSteps: Array.isArray(data.ritualSteps) ? (data.ritualSteps as string[]) : [],
          botanicals: Array.isArray(data.botanicals) ? (data.botanicals as string[]) : [],
          imageUrl: String(data.imageUrl),
          featured: Boolean(data.featured),
        };
      });

      items.sort((a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id);
      onData(items, true);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeSpecialists(
  onData: (specialists: Specialist[], syncedInFirestore: boolean) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'specialists';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) {
        onData(SEED_SPECIALISTS, false);
        return;
      }

      const items: Specialist[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: Number(data.id),
          docId: d.id,
          name: String(data.name),
          role: String(data.role),
          specialty: data.specialty as Specialist['specialty'],
          experienceYears: Number(data.experienceYears),
          bio: String(data.bio),
        };
      });

      items.sort((a, b) => a.id - b.id);
      onData(items, true);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeBookedTimes(
  appointmentDate: string,
  specialistDocId: string,
  onData: (bookedTimes: string[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'booked_slots';
  const q = query(collection(db, path), where('appointmentDate', '==', appointmentDate));

  return onSnapshot(
    q,
    (snapshot) => {
      const times: string[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.specialistId === specialistDocId && typeof data.appointmentTime === 'string') {
          times.push(data.appointmentTime);
        }
      }
      onData(times);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

function mapAppointmentDoc(id: string, data: Record<string, unknown>): Appointment {
  return {
    id,
    docId: id,
    userId: String(data.userId ?? ''),
    bookingRef: String(data.bookingRef ?? ''),
    serviceId: Number(data.serviceNumericId ?? 0),
    serviceDocId: String(data.serviceId ?? ''),
    serviceName: String(data.serviceName ?? ''),
    serviceCategory: String(data.serviceCategory ?? ''),
    durationMinutes: Number(data.durationMinutes ?? 0),
    priceUsd: Number(data.priceUsd ?? 0),
    specialistId: Number(data.specialistNumericId ?? 0),
    specialistDocId: String(data.specialistId ?? ''),
    specialistName: String(data.specialistName ?? ''),
    specialistRole: String(data.specialistRole ?? ''),
    clientName: String(data.clientName ?? ''),
    clientEmail: String(data.clientEmail ?? ''),
    clientPhone: String(data.clientPhone ?? ''),
    appointmentDate: String(data.appointmentDate ?? ''),
    appointmentTime: String(data.appointmentTime ?? ''),
    notes: String(data.notes ?? ''),
    status: (data.status as AppointmentStatus) ?? 'confirmed',
    createdAt: timestampToIso(data.createdAt),
  };
}

export function subscribeUserAppointments(
  userId: string,
  onData: (appointments: Appointment[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'appointments';
  const q = query(collection(db, path), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapAppointmentDoc(d.id, d.data() as Record<string, unknown>)
      );
      items.sort(
        (a, b) =>
          b.appointmentDate.localeCompare(a.appointmentDate) ||
          a.appointmentTime.localeCompare(b.appointmentTime)
      );
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeAdminAppointments(
  onData: (appointments: Appointment[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = 'appointments';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapAppointmentDoc(d.id, d.data() as Record<string, unknown>)
      );
      items.sort(
        (a, b) =>
          b.appointmentDate.localeCompare(a.appointmentDate) ||
          a.appointmentTime.localeCompare(b.appointmentTime)
      );
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createFirestoreAppointment(params: {
  userId: string;
  service: ServiceItem;
  specialist: Specialist;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}): Promise<Appointment> {
  const serviceDocId = params.service.docId ?? params.service.slug;
  const specialistDocId = params.specialist.docId ?? `specialist-${params.specialist.id}`;
  const slotId = buildSlotKey(specialistDocId, params.appointmentDate, params.appointmentTime);

  const slotRef = doc(db, 'booked_slots', slotId);
  try {
    const existingSlot = await getDoc(slotRef);
    if (existingSlot.exists()) {
      throw new Error('SLOT_UNAVAILABLE');
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'SLOT_UNAVAILABLE') {
      throw new Error('That time slot was just reserved. Please choose another time.');
    }
    handleFirestoreError(error, OperationType.GET, `booked_slots/${slotId}`);
  }

  const appointmentRef = doc(collection(db, 'appointments'));
  const bookingRef = generateRandomBookingRef();

  const sanitizedClientName = params.clientName.trim().slice(0, BLUEPRINT_CONSTRAINTS.clientNameMax);
  const sanitizedClientEmail = params.clientEmail
    .trim()
    .toLowerCase()
    .slice(0, BLUEPRINT_CONSTRAINTS.clientEmailMax);
  const sanitizedClientPhone = params.clientPhone
    .trim()
    .slice(0, BLUEPRINT_CONSTRAINTS.clientPhoneMax);
  const sanitizedNotes = params.notes.trim().slice(0, BLUEPRINT_CONSTRAINTS.notesMax);

  const batch = writeBatch(db);

  batch.set(appointmentRef, {
    userId: params.userId,
    bookingRef,
    serviceId: serviceDocId,
    serviceNumericId: params.service.id,
    serviceName: params.service.name.slice(0, 120),
    serviceCategory: params.service.category,
    durationMinutes: params.service.durationMinutes,
    priceUsd: params.service.priceUsd,
    specialistId: specialistDocId,
    specialistNumericId: params.specialist.id,
    specialistName: params.specialist.name.slice(0, 80),
    specialistRole: params.specialist.role.slice(0, 100),
    clientName: sanitizedClientName,
    clientEmail: sanitizedClientEmail,
    clientPhone: sanitizedClientPhone,
    appointmentDate: params.appointmentDate,
    appointmentTime: params.appointmentTime,
    notes: sanitizedNotes,
    status: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(slotRef, {
    specialistId: specialistDocId,
    specialistNumericId: params.specialist.id,
    appointmentDate: params.appointmentDate,
    appointmentTime: params.appointmentTime,
    appointmentId: appointmentRef.id,
    bookedByUid: params.userId,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `appointments/${appointmentRef.id}`);
  }

  return {
    id: appointmentRef.id,
    docId: appointmentRef.id,
    userId: params.userId,
    bookingRef,
    serviceId: params.service.id,
    serviceDocId,
    serviceName: params.service.name,
    serviceCategory: params.service.category,
    durationMinutes: params.service.durationMinutes,
    priceUsd: params.service.priceUsd,
    specialistId: params.specialist.id,
    specialistDocId,
    specialistName: params.specialist.name,
    specialistRole: params.specialist.role,
    clientName: sanitizedClientName,
    clientEmail: sanitizedClientEmail,
    clientPhone: sanitizedClientPhone,
    appointmentDate: params.appointmentDate,
    appointmentTime: params.appointmentTime,
    notes: sanitizedNotes,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
}

export async function rescheduleFirestoreAppointment(params: {
  appointment: Appointment;
  userId: string;
  newDate: string;
  newTime: string;
  specialist: Specialist;
  notes?: string;
}): Promise<void> {
  const apptDocId = params.appointment.docId ?? String(params.appointment.id);
  const oldSpecialistDocId =
    params.appointment.specialistDocId ?? `specialist-${params.appointment.specialistId}`;
  const newSpecialistDocId = params.specialist.docId ?? `specialist-${params.specialist.id}`;

  const oldSlotId = buildSlotKey(
    oldSpecialistDocId,
    params.appointment.appointmentDate,
    params.appointment.appointmentTime
  );
  const newSlotId = buildSlotKey(newSpecialistDocId, params.newDate, params.newTime);

  let oldSlotExists = false;
  if (oldSlotId !== newSlotId) {
    try {
      const [oldSlotSnap, targetSlot] = await Promise.all([
        getDoc(doc(db, 'booked_slots', oldSlotId)),
        getDoc(doc(db, 'booked_slots', newSlotId)),
      ]);
      oldSlotExists = oldSlotSnap.exists();
      if (targetSlot.exists()) {
        throw new Error('SLOT_UNAVAILABLE');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'SLOT_UNAVAILABLE') {
        throw new Error('That time slot is unavailable. Please pick another time.');
      }
      handleFirestoreError(error, OperationType.GET, `booked_slots/${newSlotId}`);
    }
  }

  const batch = writeBatch(db);
  const apptRef = doc(db, 'appointments', apptDocId);

  if (oldSlotId !== newSlotId) {
    if (oldSlotExists) {
      batch.delete(doc(db, 'booked_slots', oldSlotId));
    }
    batch.set(doc(db, 'booked_slots', newSlotId), {
      specialistId: newSpecialistDocId,
      specialistNumericId: params.specialist.id,
      appointmentDate: params.newDate,
      appointmentTime: params.newTime,
      appointmentId: apptDocId,
      bookedByUid: params.userId,
      createdAt: serverTimestamp(),
    });
  }

  batch.update(apptRef, {
    appointmentDate: params.newDate,
    appointmentTime: params.newTime,
    specialistId: newSpecialistDocId,
    specialistNumericId: params.specialist.id,
    specialistName: params.specialist.name.slice(0, 80),
    specialistRole: params.specialist.role.slice(0, 100),
    notes:
      params.notes !== undefined
        ? params.notes.trim().slice(0, BLUEPRINT_CONSTRAINTS.notesMax)
        : params.appointment.notes,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `appointments/${apptDocId}`);
  }
}

export async function cancelFirestoreAppointment(appointment: Appointment): Promise<void> {
  const apptDocId = appointment.docId ?? String(appointment.id);
  const specialistDocId =
    appointment.specialistDocId ?? `specialist-${appointment.specialistId}`;
  const slotId = buildSlotKey(
    specialistDocId,
    appointment.appointmentDate,
    appointment.appointmentTime
  );

  const slotRef = doc(db, 'booked_slots', slotId);
  let slotExists = false;
  try {
    const slotSnap = await getDoc(slotRef);
    slotExists = slotSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `booked_slots/${slotId}`);
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'appointments', apptDocId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
  if (slotExists) {
    batch.delete(slotRef);
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `appointments/${apptDocId}`);
  }
}

export async function updateAppointmentStatusByAdmin(
  appointment: Appointment,
  status: AppointmentStatus
): Promise<void> {
  const apptDocId = appointment.docId ?? String(appointment.id);
  const specialistDocId =
    appointment.specialistDocId ?? `specialist-${appointment.specialistId}`;
  const slotId = buildSlotKey(
    specialistDocId,
    appointment.appointmentDate,
    appointment.appointmentTime
  );

  const slotRef = doc(db, 'booked_slots', slotId);
  let slotExists = false;
  if (status === 'cancelled' || status === 'completed') {
    try {
      const slotSnap = await getDoc(slotRef);
      slotExists = slotSnap.exists();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `booked_slots/${slotId}`);
    }
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'appointments', apptDocId), {
    status,
    updatedAt: serverTimestamp(),
  });

  if ((status === 'cancelled' || status === 'completed') && slotExists) {
    batch.delete(slotRef);
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `appointments/${apptDocId}`);
  }
}
