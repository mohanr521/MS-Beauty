import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {
  cancelAppointmentRecord,
  createAppointmentRecord,
  getBookedTimesForDateAndSpecialist,
  getDb,
  listServices,
  listSpecialists,
  lookupAppointments,
  rescheduleAppointmentRecord,
} from './server/db.ts';
import {
  computeSlotAvailability,
  hasValidationErrors,
  STUDIO_TIME_SLOTS,
  toIsoDateString,
  validateBookingInput,
} from './src/utils/bookingRules.ts';

const PORT = Number(process.env.PORT ?? 3000);

async function startServer(): Promise<void> {
  // Ensure database & seed tables initialize at startup
  getDb();

  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'MS Cosmetics' });
  });

  app.get('/api/services', (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.q === 'string' ? req.query.q : undefined;
      const services = listServices(category, search);
      res.json({ services });
    } catch (error) {
      console.error('Failed to list services:', error);
      res.status(500).json({ error: 'Unable to load beauty services.' });
    }
  });

  app.get('/api/specialists', (_req, res) => {
    try {
      const specialists = listSpecialists();
      res.json({ specialists });
    } catch (error) {
      console.error('Failed to list specialists:', error);
      res.status(500).json({ error: 'Unable to load specialists.' });
    }
  });

  app.get('/api/availability', (req, res) => {
    try {
      const dateParam = typeof req.query.date === 'string' ? req.query.date.trim() : '';
      const specialistParam = Number(req.query.specialistId);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        res.status(400).json({ error: 'Valid YYYY-MM-DD date parameter is required.' });
        return;
      }

      if (!Number.isInteger(specialistParam) || specialistParam <= 0) {
        res.status(400).json({ error: 'Valid specialistId parameter is required.' });
        return;
      }

      const bookedTimes = getBookedTimesForDateAndSpecialist(dateParam, specialistParam);
      const slots = computeSlotAvailability(bookedTimes, dateParam);
      res.json({ date: dateParam, specialistId: specialistParam, slots });
    } catch (error) {
      console.error('Failed to check availability:', error);
      res.status(500).json({ error: 'Unable to check appointment availability.' });
    }
  });

  app.get('/api/appointments/lookup', (req, res) => {
    try {
      const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
      if (query.length < 3) {
        res.status(400).json({
          error: 'Enter your booking reference (e.g. MSC-1001) or full email address.',
        });
        return;
      }
      const appointments = lookupAppointments(query);
      res.json({ appointments });
    } catch (error) {
      console.error('Failed to look up appointments:', error);
      res.status(500).json({ error: 'Unable to retrieve appointments.' });
    }
  });

  app.post('/api/appointments', (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const payload = {
        serviceId: Number(body.serviceId),
        specialistId: Number(body.specialistId),
        clientName: typeof body.clientName === 'string' ? body.clientName : '',
        clientEmail: typeof body.clientEmail === 'string' ? body.clientEmail : '',
        clientPhone: typeof body.clientPhone === 'string' ? body.clientPhone : '',
        appointmentDate: typeof body.appointmentDate === 'string' ? body.appointmentDate : '',
        appointmentTime: typeof body.appointmentTime === 'string' ? body.appointmentTime : '',
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 400) : '',
      };

      const errors = validateBookingInput(payload);
      if (hasValidationErrors(errors)) {
        res.status(400).json({
          error: 'Please check your booking details.',
          fieldErrors: errors,
        });
        return;
      }

      // Check same-day lead time on server as well
      const bookedTimes = getBookedTimesForDateAndSpecialist(
        payload.appointmentDate,
        payload.specialistId
      );
      const slots = computeSlotAvailability(bookedTimes, payload.appointmentDate);
      const chosenSlot = slots.find((s) => s.time === payload.appointmentTime);
      if (!chosenSlot || !chosenSlot.available) {
        res.status(409).json({
          error:
            chosenSlot?.reason === 'past'
              ? 'Selected time slot is no longer available today. Please choose a later time.'
              : 'That time slot was just reserved. Please choose another time.',
        });
        return;
      }

      const appointment = createAppointmentRecord(payload);
      res.status(201).json({ appointment });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN';
      if (message === 'SLOT_UNAVAILABLE') {
        res.status(409).json({
          error: 'That time slot is already booked for this specialist. Please select another.',
        });
        return;
      }
      if (message === 'SERVICE_NOT_FOUND' || message === 'SPECIALIST_NOT_FOUND') {
        res.status(404).json({ error: 'Selected service or specialist was not found.' });
        return;
      }
      console.error('Failed to create appointment:', error);
      res.status(500).json({ error: 'Unable to complete booking right now.' });
    }
  });

  app.patch('/api/appointments/:ref', (req, res) => {
    try {
      const bookingRef = req.params.ref;
      const body = req.body as Record<string, unknown>;
      const clientEmail = typeof body.clientEmail === 'string' ? body.clientEmail.trim() : '';
      const appointmentDate =
        typeof body.appointmentDate === 'string' ? body.appointmentDate.trim() : '';
      const appointmentTime =
        typeof body.appointmentTime === 'string' ? body.appointmentTime.trim() : '';
      const specialistId =
        body.specialistId !== undefined ? Number(body.specialistId) : undefined;
      const notes = typeof body.notes === 'string' ? body.notes.slice(0, 400) : undefined;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clientEmail)) {
        res.status(400).json({ error: 'Please provide the booking email to confirm changes.' });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || appointmentDate < toIsoDateString(new Date())) {
        res.status(400).json({ error: 'Please choose a valid upcoming date.' });
        return;
      }
      if (!STUDIO_TIME_SLOTS.some((s) => s.time === appointmentTime)) {
        res.status(400).json({ error: 'Please choose a valid studio time slot.' });
        return;
      }

      const updated = rescheduleAppointmentRecord(bookingRef, {
        clientEmail,
        appointmentDate,
        appointmentTime,
        specialistId: Number.isInteger(specialistId) ? specialistId : undefined,
        notes,
      });

      res.json({ appointment: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN';
      if (message === 'BOOKING_NOT_FOUND') {
        res.status(404).json({ error: 'Appointment reference not found.' });
        return;
      }
      if (message === 'EMAIL_MISMATCH') {
        res.status(403).json({ error: 'Email address does not match this appointment.' });
        return;
      }
      if (message === 'BOOKING_CANCELLED') {
        res.status(400).json({ error: 'Cancelled appointments cannot be rescheduled.' });
        return;
      }
      if (message === 'SLOT_UNAVAILABLE') {
        res.status(409).json({ error: 'That time slot is unavailable. Please pick another time.' });
        return;
      }
      console.error('Failed to reschedule appointment:', error);
      res.status(500).json({ error: 'Unable to reschedule appointment.' });
    }
  });

  app.delete('/api/appointments/:ref', (req, res) => {
    try {
      const bookingRef = req.params.ref;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const clientEmail =
        typeof body.clientEmail === 'string'
          ? body.clientEmail.trim()
          : typeof req.query.email === 'string'
            ? req.query.email.trim()
            : '';

      if (!clientEmail) {
        res.status(400).json({ error: 'Please provide your email address to cancel.' });
        return;
      }

      const cancelled = cancelAppointmentRecord(bookingRef, clientEmail);
      res.json({ appointment: cancelled });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN';
      if (message === 'BOOKING_NOT_FOUND') {
        res.status(404).json({ error: 'Appointment reference not found.' });
        return;
      }
      if (message === 'EMAIL_MISMATCH') {
        res.status(403).json({ error: 'Email address does not match this appointment.' });
        return;
      }
      console.error('Failed to cancel appointment:', error);
      res.status(500).json({ error: 'Unable to cancel appointment.' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MS Cosmetics server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
