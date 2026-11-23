import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSlotAvailability,
  filterServices,
  formatBookingDate,
  formatDuration,
  formatPrice,
  generateBookingRef,
  hasValidationErrors,
  validateBookingInput,
} from './bookingRules';
import type { ServiceItem } from '../types/parlour';

const SAMPLE_SERVICES: ServiceItem[] = [
  {
    id: 1,
    slug: 'botanical-hydra-facial',
    name: 'Botanical Hydra-Sculpt Facial',
    category: 'Facial & Skin',
    durationMinutes: 75,
    priceUsd: 165,
    shortDescription: 'Lymphatic rose-quartz sculpting paired with hyaluronic botanical infusion.',
    fullDescription: 'Full facial treatment.',
    ritualSteps: ['Cleanse', 'Sculpt'],
    botanicals: ['Rosehip Seed', 'Neroli'],
    imageUrl: '/src/assets/images/sample.jpg',
    featured: true,
  },
  {
    id: 2,
    slug: 'bridal-radiance-artistry',
    name: 'Bridal Radiance Makeup & Trial',
    category: 'Bridal & Makeup',
    durationMinutes: 120,
    priceUsd: 320,
    shortDescription: 'Luminous satin-skin artistry tailored for all-day bridal photography.',
    fullDescription: 'Full bridal artistry.',
    ritualSteps: ['Prep', 'Artistry'],
    botanicals: ['Squalane', 'Damask Rose'],
    imageUrl: '/src/assets/images/sample2.jpg',
    featured: true,
  },
];

test('formatPrice and formatDuration format numbers cleanly', () => {
  assert.equal(formatPrice(165), '$165');
  assert.equal(formatPrice(320), '$320');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(60), '1 hr');
  assert.equal(formatDuration(75), '1 hr 15 min');
});

test('computeSlotAvailability marks booked and past slots unavailable', () => {
  const mockNow = new Date(2026, 10, 23, 10, 15); // 10:15 AM on 2026-11-23
  const slotsToday = computeSlotAvailability(['13:00', '16:00'], '2026-11-23', mockNow);

  const slot0930 = slotsToday.find((s) => s.time === '09:30');
  const slot1030 = slotsToday.find((s) => s.time === '10:30');
  const slot1130 = slotsToday.find((s) => s.time === '11:30');
  const slot1300 = slotsToday.find((s) => s.time === '13:00');

  assert.equal(slot0930?.available, false);
  assert.equal(slot0930?.reason, 'past');
  assert.equal(slot1030?.available, false); // within 30 min lead time
  assert.equal(slot1030?.reason, 'past');
  assert.equal(slot1130?.available, true);
  assert.equal(slot1300?.available, false);
  assert.equal(slot1300?.reason, 'booked');

  const slotsFuture = computeSlotAvailability(['13:00'], '2026-11-24', mockNow);
  assert.equal(slotsFuture.find((s) => s.time === '09:30')?.available, true);
  assert.equal(slotsFuture.find((s) => s.time === '13:00')?.available, false);
});

test('validateBookingInput catches missing or malformed fields and passes valid payloads', () => {
  const refDate = new Date(2026, 10, 23, 9, 0);

  const badErrors = validateBookingInput(
    {
      serviceId: 0,
      specialistId: 1,
      clientName: 'A',
      clientEmail: 'not-an-email',
      clientPhone: '123',
      appointmentDate: '2026-11-20',
      appointmentTime: '99:99',
    },
    refDate
  );

  assert.equal(hasValidationErrors(badErrors), true);
  assert.ok(badErrors.serviceId);
  assert.ok(badErrors.clientName);
  assert.ok(badErrors.clientEmail);
  assert.ok(badErrors.clientPhone);
  assert.ok(badErrors.appointmentDate);
  assert.ok(badErrors.appointmentTime);

  const validErrors = validateBookingInput(
    {
      serviceId: 1,
      specialistId: 2,
      clientName: 'Maya Lin',
      clientEmail: 'maya.lin@example.com',
      clientPhone: '+1 (415) 555-0192',
      appointmentDate: '2026-11-24',
      appointmentTime: '11:30',
    },
    refDate
  );

  assert.equal(hasValidationErrors(validErrors), false);
});

test('filterServices filters accurately by category and botanical keyword', () => {
  assert.equal(filterServices(SAMPLE_SERVICES, 'All', '').length, 2);
  assert.equal(filterServices(SAMPLE_SERVICES, 'Bridal & Makeup', '').length, 1);
  assert.equal(filterServices(SAMPLE_SERVICES, 'All', 'neroli').length, 1);
  assert.equal(filterServices(SAMPLE_SERVICES, 'Facial & Skin', 'bridal').length, 0);
});

test('generateBookingRef and formatBookingDate produce deterministic output', () => {
  assert.equal(generateBookingRef(1), 'MSC-1001');
  assert.equal(generateBookingRef(42), 'MSC-1042');
  assert.match(formatBookingDate('2026-11-24'), /Nov 24, 2026/);
});
