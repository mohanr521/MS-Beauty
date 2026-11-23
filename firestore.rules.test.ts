import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');

test('firestore.rules exists and enforces Eight Pillars invariants', () => {
  assert.equal(fs.existsSync(RULES_PATH), true, 'firestore.rules must exist');
  const rules = fs.readFileSync(RULES_PATH, 'utf8');

  assert.match(rules, /rules_version\s*=\s*'2'/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;/);
  assert.match(rules, /email_verified == true/);
  assert.match(rules, /isValidId\(/);
  assert.match(rules, /isValidAppointment\(/);
  assert.match(rules, /isValidBookedSlot\(/);
  assert.match(rules, /isValidService\(/);
  assert.match(rules, /isValidSpecialist\(/);
  assert.match(rules, /existsAfter\(/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(/);
  assert.match(rules, /request\.time/);
  assert.match(rules, /existing\(\)\.userId == request\.auth\.uid/);
});

test('Dirty Dozen adversarial payload checks match blueprint constraints', () => {
  const blueprint = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8')
  ) as {
    entities: Record<string, { required: string[]; properties: Record<string, { maxLength?: number }> }>;
  };

  const apptProps = blueprint.entities.Appointment.properties;
  assert.equal(apptProps.notes.maxLength, 400);
  assert.equal(apptProps.clientName.maxLength, 80);
  assert.equal(apptProps.clientEmail.maxLength, 120);
  assert.equal(apptProps.appointmentDate.maxLength, 10);
  assert.equal(apptProps.appointmentTime.maxLength, 5);
});
