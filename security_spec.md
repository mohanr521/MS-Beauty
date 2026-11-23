# MS Cosmetics Firestore Security Specification

## 1. Data Invariants

1. **No Public PII Exposure**: `/appointments/{appointmentId}` contains `clientName`, `clientEmail`, `clientPhone`, and `notes`. Reads (`get` and `list`) are strictly restricted to the authenticated owner (`resource.data.userId == request.auth.uid`) or a verified studio admin.
2. **Atomic Slot Locking**: Every confirmed `/appointments/{appointmentId}` creation MUST be paired atomically with a `/booked_slots/{slotId}` document (`existsAfter`) keyed deterministically as `<specialistId>_<appointmentDate>_<HHMM>` so two users cannot double-book the same specialist and time slot.
3. **Referential Integrity**: Creating an appointment requires `exists()` verification that both `/services/{serviceId}` and `/specialists/{specialistId}` exist.
4. **Immutable Ownership & Terminal State Locking**: `userId`, `bookingRef`, `serviceId`, `serviceNumericId`, `priceUsd`, and `createdAt` cannot be modified after creation. Once an appointment reaches `'cancelled'` or `'completed'`, non-admin users cannot modify it.
5. **Catalog Protection**: `/services` and `/specialists` contain zero PII and are publicly readable (`get`, `list`), while all writes (`create`, `update`, `delete`) require verified studio admin privileges.
6. **Verified Identity & Strict Payloads**: All client writes require `request.auth != null && request.auth.token.email_verified == true`, strict `keys().hasAll(...)` / `keys().hasOnly(...)` schema validation, `string.size()` caps, and server-verified `request.time` timestamps.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Appointment Create**: Missing `request.auth` on `/appointments/{id}` -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Create**: `userId` set to another user's UID (`"victim-uid"`) -> `PERMISSION_DENIED`.
3. **Shadow / Ghost Field Injection**: Extra unexpected key (`isAdminOverride: true` or `discountApplied: 100`) on appointment create -> `PERMISSION_DENIED`.
4. **Orphaned Appointment Without Slot Lock**: Creating `/appointments/{id}` without atomically creating `/booked_slots/{slotId}` -> `PERMISSION_DENIED`.
5. **Orphaned Slot Lock Without Appointment**: Creating `/booked_slots/{slotId}` without atomically creating `/appointments/{id}` -> `PERMISSION_DENIED`.
6. **Invalid Service / Specialist Reference**: `serviceId: "non-existent-service"` -> `PERMISSION_DENIED`.
7. **PII Read by Non-Owner**: Authenticated user B attempting `get` or `list` on user A's appointment -> `PERMISSION_DENIED`.
8. **Unfiltered List Query Scraping**: Authenticated user running `getDocs(collection(db, 'appointments'))` without `where('userId', '==', uid)` -> `PERMISSION_DENIED`.
9. **Terminal State Resurrection**: Owner attempting to change `status` from `'cancelled'` back to `'confirmed'` -> `PERMISSION_DENIED`.
10. **Price / Fee Tampering on Update**: Owner attempting to modify `priceUsd` or `userId` during a reschedule -> `PERMISSION_DENIED`.
11. **Oversized String / Path ID Poisoning**: 2KB string in `notes` or invalid characters (`../bad`) in document ID -> `PERMISSION_DENIED`.
12. **Unverified Email Admin Spoof**: Token claiming admin email with `email_verified: false` attempting to write `/services/{id}` -> `PERMISSION_DENIED`.
