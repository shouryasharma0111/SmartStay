# SmartStay API

Node.js + Express API with MySQL migrations, database-backed login sessions, and server-side role guards. The static frontend uses this API for authentication and property listings; dashboard areas outside property management may still contain demo data.

## Requirements

- Node.js 20 or newer
- MySQL 8.0 or newer

## Setup

1. Create a MySQL database and separate runtime/migration users. For example, in MySQL Workbench:

   ```sql
   CREATE DATABASE smartstay CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
    CREATE USER 'smartstay_app'@'localhost' IDENTIFIED BY 'use-a-strong-app-password';
    GRANT SELECT, INSERT, UPDATE, DELETE ON smartstay.* TO 'smartstay_app'@'localhost';
    CREATE USER 'smartstay_migrator'@'localhost' IDENTIFIED BY 'use-a-strong-migration-password';
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
       ON smartstay.* TO 'smartstay_migrator'@'localhost';
   ```

2. Copy `.env.example` to `.env` and set the MySQL values and frontend origin. Never commit `.env`.
   The API uses `MYSQL_USER`/`MYSQL_PASSWORD`; migrations use `MYSQL_MIGRATION_USER`/`MYSQL_MIGRATION_PASSWORD`.

3. Install dependencies and apply migrations:

   ```powershell
   npm install
   npm run migrate
   ```

4. Start the API:

   ```powershell
   npm run dev
   ```

The readiness endpoint is `GET http://localhost:3000/api/health`; it returns success only when MySQL is reachable.

## Authentication API

- `POST /api/auth/register` accepts `{ "name", "email", "password", "role" }`. `role` may be `tenant` or `owner`; public registration cannot create admins. Passwords must be at least 12 characters.
- `POST /api/auth/login` accepts `{ "email", "password" }`.
- `POST /api/auth/logout` revokes the current database session and clears its cookie.
- `GET /api/auth/me` returns the authenticated user.
- `GET /api/properties` returns verified public listings and supports search, location, rent, gender, sharing, amenities, and availability filters.
- `GET /api/properties/:id` returns a public verified listing.
- `GET /api/properties/:id/freshness` returns tenant-safe property and unit availability freshness; public listings also include calculated freshness fields.
- `POST /api/properties` requires an owner session and always creates a `PENDING` listing.
- `GET /api/owner/properties`, `PATCH /api/owner/properties/:id`, and `DELETE /api/owner/properties/:id` require an owner session and scope every operation to that owner.
- `GET /api/owner/properties/:propertyId/units` lists units for the authenticated owner's property.
- `POST /api/owner/properties/:propertyId/units` creates a unit using `{ "name", "availabilityStatus" }`; availability defaults to `AVAILABLE`.
- `PATCH /api/owner/properties/:propertyId/units/:unitId` updates the unit name and/or availability. All unit writes verify ownership through the associated property.
- Supplying `availabilityStatus` to the existing owner update routes confirms the status using a server-side timestamp. These confirmations are owner-scoped and written with an availability event; changing a unit name alone does not refresh availability.
- Public property listing responses include each property's units and their availability. The `availableNow` filter checks for an `AVAILABLE` unit when units exist and preserves the legacy property-level availability for listings without units.
- `GET /api/admin/properties`, `DELETE /api/admin/properties/:id`, and `PATCH /api/admin/properties/:id/verification` require an admin session.
- `GET /api/admin/audit-logs` requires a valid session whose database role is `admin`.
- `PATCH /api/admin/properties/:id/verification` approves or rejects a property. Rejections require a reason; the decision, audit entry, and owner notification are committed together.

Public signup intentionally cannot grant the `admin` role. To provision the first administrator, first register that person normally, then use a privileged MySQL account to promote the verified account:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Run that statement only through trusted database administration access, never from a public API endpoint.

Successful registration and login set an HttpOnly `smartstay.sid` cookie. Only its SHA-256 hash is stored in MySQL. Production cookies are `Secure`; set HTTPS and `NODE_ENV=production` in production.

## Checks

```powershell
npm test
```

The initial migration creates users, sessions, properties, property images, verification documents, saved properties, inquiries, reviews, reports, notifications, and admin audit logs. Migration `004_property_units.sql` creates the room/unit availability table with `AVAILABLE`, `OCCUPIED`, `RESERVED`, and `CONFIRMATION_REQUIRED` statuses. Migration `005_availability_freshness.sql` adds server-maintained confirmation timestamps and a minimal availability-event history; existing listings are backfilled from their creation timestamps. Apply later numbered SQL migrations with `npm run migrate`; applied migration filenames are recorded in `schema_migrations`.

### Availability Freshness

Freshness is calculated at read time by `src/services/freshness-service.js`; scores are not persisted. The default bands are `FRESH` through 2 hours, `RECENTLY_CONFIRMED` through 6 hours, `CONFIRMATION_RECOMMENDED` until 12 hours, `CONFIRMATION_REQUIRED` until 24 hours, then `STALE`. The score decays continuously using a configurable 12-hour half-life. `requiresConfirmation` stays false for the recommendation band and becomes true at the confirmation-required band, so passage through scoring bands does not itself create owner prompts.

Thresholds and confidence adjustments can be tuned in `.env`: `FRESHNESS_FRESH_HOURS`, `FRESHNESS_RECENT_HOURS`, `FRESHNESS_RECOMMENDED_HOURS`, `FRESHNESS_REQUIRED_HOURS`, `FRESHNESS_DECAY_HALF_LIFE_HOURS`, `FRESHNESS_MISMATCH_WINDOW_HOURS`, `FRESHNESS_MISMATCH_PENALTY`, `FRESHNESS_MAX_MISMATCH_PENALTY`, and `FRESHNESS_BOOKING_CONFLICT_MULTIPLIER`. Thresholds must be ordered. Recent open/investigating availability-related reports lower confidence without changing the persisted availability state. Occupied, reserved, and confirmation-required units return `UNAVAILABLE` freshness with zero availability confidence. This schema has no booking/reservation table, so booking conflicts are supported by the service calculation interface but are not currently queried. Historical owner reliability is not available and is not invented.

## DigiLocker Verification

### Page Mapping

- Page 1, `SmartStay Homepage(HTML).html`: login and registration use database-backed API sessions.
- Page 2, `SmartStay TenantDashboard (HTML).html`: displays listing verification status and a production-only filter. Tenants cannot initiate owner verification.
- Page 3, `SmartStay OwnerDashboard (HTML).html`: the Documents panel contains the owner-facing verification controls and per-property status.
- Page 4, `Smartstay PropertyListing (HTML).html`: property cards show a production verified badge only when the verification record is `PRODUCTION` and `VERIFIED`; demo results are labeled as demo.
- Page 5, `SmartStay AdminDashboard (HTML).html`: the existing admin app contains the Verification Center and filters/review actions.

### Current Demo and Backend State

The static frontend supports a local demo mode: registrations, properties, and property review actions are stored in that browser's localStorage, so owner listing workflows can be tried without a running API or MySQL. Local demo data is not shared across browsers or devices and is not production-secure. Database-backed endpoints remain available for configured API sessions. The owner verification flow simulates consent and supports matched, failed, and manual-review outcomes; local demo results are labeled `Demo/Sandbox Verification`. It does not contact DigiLocker, retrieve a document, or create a government-verified listing badge.

For database-backed use, apply the schema with `npm run migrate`; migration `003_property_listing_fields.sql` adds the listing attributes used by the browser. The API only permits owners to read, update, delete, or create verification records for properties owned by their authenticated session. Admin API routes use the database-backed admin role guard.

Backend endpoints:

- `POST /api/digilocker/properties/:id/verify` requires an owner session and `{ "consent": true }`. Sandbox accepts an optional demo scenario of `VERIFIED`, `FAILED`, or `MANUAL_REVIEW`.
- `GET /api/digilocker/properties/:id/status` is available only to the property's owner or an admin.
- `GET /api/admin/verifications?status=...` and `PATCH /api/admin/verifications/:id` require an admin session.

The `DigiLockerService` selects a demo provider for non-production and a fail-closed production adapter when `DIGILOCKER_ENV=production`. No OAuth authorization URL, callback, token exchange, PKCE parameters, issuer IDs, or document IDs have been invented. Production mode currently returns a not-configured response rather than making an external request.

### Configuration and Local Run

Set these server-only values in `backend/.env`; copy the empty names from `.env.example`. Do not put credentials in frontend JavaScript or commit `.env`.

```dotenv
DIGILOCKER_ENV=sandbox
DIGILOCKER_CLIENT_ID=
DIGILOCKER_CLIENT_SECRET=
DIGILOCKER_REDIRECT_URI=
```

For the backend demo, configure MySQL as described above, run `npm install`, `npm run migrate`, then `npm run dev`. Open the static frontend with Live Server using an origin listed in `FRONTEND_ORIGIN`. Sandbox verification needs no DigiLocker credentials.

### Data and Privacy

`property_verifications` stores owner/property foreign keys, provider, mode, status, document type, issuer, matching result, a minimal JSON metadata object, reason, consent time, and verification time. The demo metadata only records that it is simulated. The system does not store Aadhaar/PAN numbers, document numbers, document images/XML, OAuth state, access/refresh tokens, or client secrets. DigiLocker documents are a trusted digital-document source, not automatic proof of legal property ownership.

### Production Onboarding

Production is not enabled by adding credentials alone. API Setu's official [DigiLocker Partners Resource Center](https://apisetu.gov.in/digilocker/) publishes requester resources and onboarding material. SmartStay still needs an approved requester/partner account, the current requester specification and environment-specific credentials, registered redirect URI, approved document types/issuers, and security/privacy review. Once those are provided, implement the official authorization, state/PKCE, callback, server-side exchange, consent-bound retrieval, expiry, and matching rules in `OfficialDigiLockerProvider`, then add integration tests. Until then, keep `DIGILOCKER_ENV=sandbox`; only a successful production-mode record may appear as `VERIFIED LISTING`.