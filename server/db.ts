import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Appointment, ServiceItem, Specialist } from '../src/types/parlour.ts';
import { generateBookingRef, toIsoDateString } from '../src/utils/bookingRules.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'ms_cosmetics.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  initializeSchema(db);
  seedDatabase(db);

  dbInstance = db;
  return db;
}

function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price_usd INTEGER NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT NOT NULL,
      ritual_steps_json TEXT NOT NULL,
      botanicals_json TEXT NOT NULL,
      image_url TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS specialists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      specialty TEXT NOT NULL,
      experience_years INTEGER NOT NULL,
      bio TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT NOT NULL UNIQUE,
      service_id INTEGER NOT NULL,
      specialist_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (specialist_id) REFERENCES specialists(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_slot
      ON appointments (specialist_id, appointment_date, appointment_time)
      WHERE status = 'confirmed';
  `);
}

function seedDatabase(db: DatabaseSync): void {
  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
  if (serviceCount.count === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (
        slug, name, category, duration_minutes, price_usd,
        short_description, full_description, ritual_steps_json,
        botanicals_json, image_url, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedServices = [
      {
        slug: 'botanical-hydra-sculpt-facial',
        name: 'Botanical Hydra-Sculpt Facial',
        category: 'Facial & Skin',
        durationMinutes: 75,
        priceUsd: 165,
        shortDescription:
          'Lymphatic rose-quartz sculpting paired with cold-pressed hyaluronic botanical infusion.',
        fullDescription:
          'Our signature facial ritual lifts facial contours and restores deep barrier hydration. Gentle enzymatic resurfacing is followed by 25 minutes of rhythmic rose-quartz gua sha drainage and a custom-blended botanical ampoule.',
        ritualSteps: [
          'Warm linen compress & oil double-cleanse',
          'Botanical fruit-enzyme micro-polish',
          'Lymphatic rose-quartz gua sha sculpting',
          'Cold-pressed neroli & hyaluronic mask',
        ],
        botanicals: ['Rosehip Seed', 'Bitter Orange Neroli', 'White Tea'],
        imageUrl: '/src/assets/images/service_facial_glow_1795442359860.jpg',
        featured: 1,
      },
      {
        slug: 'bridal-radiance-artistry',
        name: 'Bridal Radiance Makeup & Trial',
        category: 'Bridal & Makeup',
        durationMinutes: 120,
        priceUsd: 320,
        shortDescription:
          'Luminous satin-skin complexion artistry tailored for daylight and evening photography.',
        fullDescription:
          'Designed for brides and milestone celebrations, this bespoke session pairs barrier-plumping skin preparation with weightless, transfer-resistant mineral pigments that photograph naturally in every lighting condition.',
        ritualSteps: [
          'Undertone mapping & lighting consultation',
          'Hydrating squalane & rosewater skin prep',
          'Custom-blended satin complexion & eye artistry',
          'Lash placement & long-wear mist seal',
        ],
        botanicals: ['Olive Squalane', 'Damask Rose', 'Silk Amino'],
        imageUrl: '/src/assets/images/service_bridal_makeup_1795442359653.jpg',
        featured: 1,
      },
      {
        slug: 'silk-cedarwood-scalp-ritual',
        name: 'Silk & Cedarwood Scalp Ritual',
        category: 'Hair & Scalp',
        durationMinutes: 60,
        priceUsd: 140,
        shortDescription:
          'Micro-exfoliating rosemary clay detox, warm oil acupressure, and cashmere blowout.',
        fullDescription:
          'Restore scalp vitality and mirror-like hair gloss. Mineral-rich French clay removes buildup before warm cedarwood and rosemary elixir is massaged into tension points, finishing with a silk-press or soft wave blowout.',
        ritualSteps: [
          'Dry bristle brushing & scalp diagnostic',
          'Mineral clay & rosemary follicle detox',
          'Warm cedarwood acupressure massage',
          'Steam hydration mask & signature blowout',
        ],
        botanicals: ['Atlas Cedarwood', 'Wild Rosemary', 'Camellia Oil'],
        imageUrl: '/src/assets/images/service_hair_ritual_1795442359660.jpg',
        featured: 1,
      },
      {
        slug: 'eucalyptus-hand-nail-spa',
        name: 'Eucalyptus Hand & Nail Spa',
        category: 'Nail & Spa',
        durationMinutes: 60,
        priceUsd: 95,
        shortDescription:
          'Warm chamomile soak, precision cuticle care, jojoba paraffin wrap, and breathable polish.',
        fullDescription:
          'A restorative manicure experience far beyond standard polish. Hands and forearms are steeped in warm chamomile-eucalyptus water, exfoliated with fine sea salt, cocooned in jojoba balm, and finished with high-gloss breathable lacquer.',
        ritualSteps: [
          'Warm chamomile & eucalyptus botanical soak',
          'Precision nail shaping & gentle cuticle work',
          'Warm jojoba & shea forearm massage',
          'Breathable sheer or satin lacquer finish',
        ],
        botanicals: ['Silver Eucalyptus', 'Golden Jojoba', 'Roman Chamomile'],
        imageUrl: '/src/assets/images/service_nail_spa_1795442359217.jpg',
        featured: 0,
      },
      {
        slug: 'keratin-lash-brow-sculpt',
        name: 'Keratin Lash Lift & Brow Sculpt',
        category: 'Bridal & Makeup',
        durationMinutes: 60,
        priceUsd: 135,
        shortDescription:
          'Gentle keratin curl elevation and architectural brow lamination with botanical tint.',
        fullDescription:
          'Awaken your natural features without extensions or harsh adhesives. We softly lift lashes from the root with conditioning keratin peptides and sculpt brows into balanced, feathery symmetry.',
        ritualSteps: [
          'Facial proportion & brow arch mapping',
          'Peptide keratin lash lift & custom tint',
          'Soft-hold botanical brow lamination',
          'Nourishing castor & vitamin E conditioning seal',
        ],
        botanicals: ['Plant Keratin', 'Cold-Pressed Castor', 'Argan Peptide'],
        imageUrl: '/src/assets/images/service_lash_brow_1795442359820.jpg',
        featured: 0,
      },
      {
        slug: 'private-suite-barrier-renewal',
        name: 'Private Suite Barrier Renewal',
        category: 'Facial & Skin',
        durationMinutes: 90,
        priceUsd: 215,
        shortDescription:
          'Extended calming treatment in our sunlit private suite with LED therapy and cryo-globes.',
        fullDescription:
          'Ideal for sensitized or dehydrated complexions, this unhurried 90-minute sanctuary ritual pairs ceramide-rich lipid replenishment with low-level red LED light therapy and cooling cryo-globe toning.',
        ritualSteps: [
          'Private suite herbal tea & skin consultation',
          'Ceramide-lipid barrier infusion cleanse',
          '20-minute red & amber LED phototherapy',
          'Cooling cryo-globe massage & neck release',
        ],
        botanicals: ['Oat Ceramides', 'Blue Tansy', 'Sea Buckthorn'],
        imageUrl: '/src/assets/images/hero_parlour_sanctuary_1795442359903.jpg',
        featured: 1,
      },
    ];

    for (const s of seedServices) {
      insertService.run(
        s.slug,
        s.name,
        s.category,
        s.durationMinutes,
        s.priceUsd,
        s.shortDescription,
        s.fullDescription,
        JSON.stringify(s.ritualSteps),
        JSON.stringify(s.botanicals),
        s.imageUrl,
        s.featured
      );
    }
  }

  const specialistCount = db.prepare('SELECT COUNT(*) as count FROM specialists').get() as {
    count: number;
  };
  if (specialistCount.count === 0) {
    const insertSpecialist = db.prepare(`
      INSERT INTO specialists (name, role, specialty, experience_years, bio)
      VALUES (?, ?, ?, ?, ?)
    `);

    const seedSpecialists = [
      {
        name: 'Elena Vance',
        role: 'Lead Holistic Aesthetician',
        specialty: 'Facial & Skin',
        experienceYears: 11,
        bio: 'Trained in lymphatic facial sculpting and clinical barrier restoration in Zurich and New York.',
      },
      {
        name: 'Priya Nair',
        role: 'Bridal & Editorial Director',
        specialty: 'Bridal & Makeup',
        experienceYears: 9,
        bio: 'Specializes in radiant, skin-first bridal artistry and precision brow architecture.',
      },
      {
        name: 'Camille Laurent',
        role: 'Master Hair & Scalp Artist',
        specialty: 'Hair & Scalp',
        experienceYears: 12,
        bio: 'Botanical trichology specialist crafting restorative scalp rituals and effortless Parisian blowouts.',
      },
      {
        name: 'Sora Takahashi',
        role: 'Senior Nail & Spa Therapist',
        specialty: 'Nail & Spa',
        experienceYears: 8,
        bio: 'Renowned for meticulous Japanese-inspired cuticle work and calming botanical hand treatments.',
      },
    ];

    for (const sp of seedSpecialists) {
      insertSpecialist.run(sp.name, sp.role, sp.specialty, sp.experienceYears, sp.bio);
    }
  }

  const apptCount = db.prepare('SELECT COUNT(*) as count FROM appointments').get() as {
    count: number;
  };
  if (apptCount.count === 0) {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const dayAfter = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
    const tomorrowIso = toIsoDateString(tomorrow);
    const dayAfterIso = toIsoDateString(dayAfter);

    const insertAppt = db.prepare(`
      INSERT INTO appointments (
        booking_ref, service_id, specialist_id, client_name,
        client_email, client_phone, appointment_date, appointment_time,
        notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAppt.run(
      generateBookingRef(1),
      1,
      1,
      'Clare Bennett',
      'clare@example.com',
      '+1 (415) 555-0148',
      tomorrowIso,
      '10:30',
      'Prefer fragrance-free oil for sensitive cheeks.',
      'confirmed'
    );

    insertAppt.run(
      generateBookingRef(2),
      2,
      2,
      'Nadia Kapoor',
      'nadia@example.com',
      '+1 (415) 555-0183',
      tomorrowIso,
      '14:00',
      'Outdoor afternoon wedding lighting trial.',
      'confirmed'
    );

    insertAppt.run(
      generateBookingRef(3),
      3,
      3,
      'Hannah Brooks',
      'hannah@example.com',
      '+1 (415) 555-0166',
      dayAfterIso,
      '11:30',
      '',
      'confirmed'
    );
  }
}

interface ServiceRow {
  id: number;
  slug: string;
  name: string;
  category: ServiceItem['category'];
  duration_minutes: number;
  price_usd: number;
  short_description: string;
  full_description: string;
  ritual_steps_json: string;
  botanicals_json: string;
  image_url: string;
  featured: number;
}

function mapServiceRow(row: ServiceRow): ServiceItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    durationMinutes: row.duration_minutes,
    priceUsd: row.price_usd,
    shortDescription: row.short_description,
    fullDescription: row.full_description,
    ritualSteps: JSON.parse(row.ritual_steps_json) as string[],
    botanicals: JSON.parse(row.botanicals_json) as string[],
    imageUrl: row.image_url,
    featured: row.featured === 1,
  };
}

export function listServices(category?: string, search?: string): ServiceItem[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM services ORDER BY featured DESC, id ASC').all() as unknown as ServiceRow[];
  const mapped = rows.map(mapServiceRow);

  return mapped.filter((service) => {
    const matchesCat = !category || category === 'All' || service.category === category;
    if (!matchesCat) {
      return false;
    }
    if (!search || !search.trim()) {
      return true;
    }
    const q = search.trim().toLowerCase();
    return (
      service.name.toLowerCase().includes(q) ||
      service.category.toLowerCase().includes(q) ||
      service.shortDescription.toLowerCase().includes(q) ||
      service.botanicals.some((b) => b.toLowerCase().includes(q))
    );
  });
}

interface SpecialistRow {
  id: number;
  name: string;
  role: string;
  specialty: Specialist['specialty'];
  experience_years: number;
  bio: string;
}

export function listSpecialists(): Specialist[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM specialists ORDER BY id ASC').all() as unknown as SpecialistRow[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    specialty: r.specialty,
    experienceYears: r.experience_years,
    bio: r.bio,
  }));
}

export function getBookedTimesForDateAndSpecialist(date: string, specialistId: number): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT appointment_time FROM appointments
       WHERE appointment_date = ? AND specialist_id = ? AND status = 'confirmed'`
    )
    .all(date, specialistId) as Array<{ appointment_time: string }>;

  return rows.map((r) => r.appointment_time);
}

interface AppointmentJoinedRow {
  id: number;
  booking_ref: string;
  service_id: number;
  service_name: string;
  service_category: string;
  duration_minutes: number;
  price_usd: number;
  specialist_id: number;
  specialist_name: string;
  specialist_role: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
  status: Appointment['status'];
  created_at: string;
}

function mapAppointmentRow(row: AppointmentJoinedRow): Appointment {
  return {
    id: row.id,
    bookingRef: row.booking_ref,
    serviceId: row.service_id,
    serviceName: row.service_name,
    serviceCategory: row.service_category,
    durationMinutes: row.duration_minutes,
    priceUsd: row.price_usd,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    specialistRole: row.specialist_role,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

const APPOINTMENT_JOIN_SELECT = `
  SELECT
    a.id,
    a.booking_ref,
    a.service_id,
    s.name AS service_name,
    s.category AS service_category,
    s.duration_minutes,
    s.price_usd,
    a.specialist_id,
    sp.name AS specialist_name,
    sp.role AS specialist_role,
    a.client_name,
    a.client_email,
    a.client_phone,
    a.appointment_date,
    a.appointment_time,
    a.notes,
    a.status,
    a.created_at
  FROM appointments a
  INNER JOIN services s ON s.id = a.service_id
  INNER JOIN specialists sp ON sp.id = a.specialist_id
`;

export function lookupAppointments(query: string): Appointment[] {
  const db = getDb();
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  const rows = db
    .prepare(
      `${APPOINTMENT_JOIN_SELECT}
       WHERE UPPER(a.booking_ref) = UPPER(?)
          OR LOWER(a.client_email) = LOWER(?)
       ORDER BY a.appointment_date DESC, a.appointment_time ASC`
    )
    .all(normalized, normalized) as unknown as AppointmentJoinedRow[];

  return rows.map(mapAppointmentRow);
}

export function createAppointmentRecord(input: {
  serviceId: number;
  specialistId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}): Appointment {
  const db = getDb();

  db.exec('BEGIN IMMEDIATE');
  try {
    const serviceExists = db
      .prepare('SELECT id FROM services WHERE id = ?')
      .get(input.serviceId) as { id: number } | undefined;
    if (!serviceExists) {
      throw new Error('SERVICE_NOT_FOUND');
    }

    const specialistExists = db
      .prepare('SELECT id FROM specialists WHERE id = ?')
      .get(input.specialistId) as { id: number } | undefined;
    if (!specialistExists) {
      throw new Error('SPECIALIST_NOT_FOUND');
    }

    const conflict = db
      .prepare(
        `SELECT id FROM appointments
         WHERE specialist_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'confirmed'`
      )
      .get(input.specialistId, input.appointmentDate, input.appointmentTime) as
      | { id: number }
      | undefined;

    if (conflict) {
      throw new Error('SLOT_UNAVAILABLE');
    }

    const maxRow = db.prepare('SELECT COALESCE(MAX(id), 0) AS max_id FROM appointments').get() as {
      max_id: number;
    };
    const nextRef = generateBookingRef(maxRow.max_id + 1);

    const insertResult = db
      .prepare(
        `INSERT INTO appointments (
          booking_ref, service_id, specialist_id, client_name,
          client_email, client_phone, appointment_date, appointment_time,
          notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`
      )
      .run(
        nextRef,
        input.serviceId,
        input.specialistId,
        input.clientName.trim(),
        input.clientEmail.trim().toLowerCase(),
        input.clientPhone.trim(),
        input.appointmentDate,
        input.appointmentTime,
        input.notes.trim()
      );

    const createdRow = db
      .prepare(`${APPOINTMENT_JOIN_SELECT} WHERE a.id = ?`)
      .get(Number(insertResult.lastInsertRowid)) as unknown as AppointmentJoinedRow;

    db.exec('COMMIT');
    return mapAppointmentRow(createdRow);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function rescheduleAppointmentRecord(
  bookingRef: string,
  input: {
    clientEmail: string;
    appointmentDate: string;
    appointmentTime: string;
    specialistId?: number;
    notes?: string;
  }
): Appointment {
  const db = getDb();

  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db
      .prepare('SELECT * FROM appointments WHERE UPPER(booking_ref) = UPPER(?)')
      .get(bookingRef.trim()) as
      | {
          id: number;
          booking_ref: string;
          specialist_id: number;
          client_email: string;
          notes: string;
          status: string;
        }
      | undefined;

    if (!existing) {
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (existing.client_email.toLowerCase() !== input.clientEmail.trim().toLowerCase()) {
      throw new Error('EMAIL_MISMATCH');
    }

    if (existing.status === 'cancelled') {
      throw new Error('BOOKING_CANCELLED');
    }

    const targetSpecialistId = input.specialistId ?? existing.specialist_id;
    const conflict = db
      .prepare(
        `SELECT id FROM appointments
         WHERE specialist_id = ? AND appointment_date = ? AND appointment_time = ?
           AND status = 'confirmed' AND id != ?`
      )
      .get(targetSpecialistId, input.appointmentDate, input.appointmentTime, existing.id) as
      | { id: number }
      | undefined;

    if (conflict) {
      throw new Error('SLOT_UNAVAILABLE');
    }

    db.prepare(
      `UPDATE appointments
       SET specialist_id = ?, appointment_date = ?, appointment_time = ?, notes = ?
       WHERE id = ?`
    ).run(
      targetSpecialistId,
      input.appointmentDate,
      input.appointmentTime,
      input.notes !== undefined ? input.notes.trim() : existing.notes,
      existing.id
    );

    const updated = db
      .prepare(`${APPOINTMENT_JOIN_SELECT} WHERE a.id = ?`)
      .get(existing.id) as unknown as AppointmentJoinedRow;

    db.exec('COMMIT');
    return mapAppointmentRow(updated);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function cancelAppointmentRecord(bookingRef: string, clientEmail: string): Appointment {
  const db = getDb();

  const existing = db
    .prepare('SELECT id, client_email, status FROM appointments WHERE UPPER(booking_ref) = UPPER(?)')
    .get(bookingRef.trim()) as { id: number; client_email: string; status: string } | undefined;

  if (!existing) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  if (existing.client_email.toLowerCase() !== clientEmail.trim().toLowerCase()) {
    throw new Error('EMAIL_MISMATCH');
  }

  db.prepare(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`).run(existing.id);

  const updated = db
    .prepare(`${APPOINTMENT_JOIN_SELECT} WHERE a.id = ?`)
    .get(existing.id) as unknown as AppointmentJoinedRow;

  return mapAppointmentRow(updated);
}
