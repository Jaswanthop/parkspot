# ParkSpot — Parking Slot Reservation

A full-stack parking reservation app: drivers check live bay availability, book a slot, and manage their bookings, while admins monitor occupancy and revenue and manage the lot.

Built with **React + Vite** on the front end, **Node.js/Express + Mongoose** on the back end, and **MongoDB** for persistence. It is packaged as a single Render web service that serves both the REST API and the built React SPA.

> **Hosting status:** the repository is deployment-ready, but no public URL is checked in. Deploying requires your Render account plus a MongoDB Atlas connection string. Follow [Deploy to Render](#deploy-to-render) below.

![ParkSpot home page](docs/screenshots/home.png)

## Features

- **Live availability** — filter 24 seeded bays by vehicle type and level; availability is calculated for the exact time window the driver selects.
- **Safe booking** — server-side overlap checks (`start < requestedEnd && end > requestedStart`) plus a per-slot in-process lock prevent double-booking.
- **Transparent pricing** — price is calculated from the bay's hourly rate and the booking duration, rounded to cents.
- **Unique references** — every reservation gets a `PS-XXXXXX` confirmation code.
- **Authentication** — register/login with bcrypt-hashed passwords and JWT sessions; `user` and `admin` roles.
- **Driver dashboard** — upcoming, past, and cancelled bookings, with cancellation allowed before the start time.
- **Admin console** — live KPIs (occupancy, revenue, today's bookings), recent reservations, search/filter, and slot create/edit/delete.
- **History-safe deletion** — a slot with booking history is archived instead of deleted, so old reservations never become orphans.
- **Responsive dark UI** — custom CSS, mobile layouts, accessible forms, toasts, loading/empty/error states.
- **Production hardening** — Helmet, rate limiting, Zod request validation, centralized error handling, static asset caching, SPA history fallback, and graceful shutdown.

| Booking flow | Admin console |
| --- | --- |
| ![Booking section](docs/screenshots/booking.png) | ![Admin overview](docs/screenshots/admin.png) |

<p align="center">
  <img src="docs/screenshots/mobile.png" alt="ParkSpot on a mobile screen" width="320" />
</p>

## Tech stack

| Layer | Tools |
| --- | --- |
| Front end | React 18, React Router 6, Vite 6, custom CSS |
| Back end | Node.js 20+, Express 4, Mongoose 8, JWT, bcryptjs, Zod, Helmet, express-rate-limit |
| Database | MongoDB 6+ (local or MongoDB Atlas) |
| Tests | Node's built-in test runner, Supertest, `mongodb-memory-server` |
| Hosting | Render web service + MongoDB Atlas |

## Architecture

```text
Browser
  │  HTTPS
  ▼
Render web service (single Node process)
  ├── /api/*          Express REST API
  │     ├── /api/auth          register / login / profile
  │     ├── /api/slots         availability, stats, admin CRUD
  │     ├── /api/reservations  create, list mine, cancel
  │     └── /api/admin         dashboard stats, all reservations
  └── /*              client/dist static React SPA + history fallback
        │
        ▼
   MongoDB Atlas
```

In development, Vite runs on `:5173` and proxies `/api` to Express on `:5000`. In production, both are served from the same Render origin, so no CORS or API base URL configuration is needed in the client.

## Project structure

```text
parking-slot/
├── client/                   React app (Vite)
│   ├── src/
│   │   ├── pages/            Home, Login, Register, My Reservations, Admin, 404
│   │   ├── components/       Navbar, modals, toasts, protected routes
│   │   ├── context/          Auth state
│   │   ├── lib/              API client and helpers
│   │   ├── App.jsx
│   │   └── index.css         Design system and responsive styles
│   └── dist/                 Production build (generated)
├── server/
│   ├── src/
│   │   ├── app.js            Express app, middleware, static SPA serving
│   │   ├── index.js          Startup, DB connect, seed, graceful shutdown
│   │   ├── controllers/      Auth, slots, reservations, admin
│   │   ├── models/           User, Slot, Reservation
│   │   ├── routes/           API route definitions
│   │   ├── middleware/       Auth, validation, error handling
│   │   ├── validators/       Zod schemas
│   │   ├── utils/            Seeding, serializers, per-slot lock
│   │   └── config/           Environment and database
│   ├── tests/api.test.js      API integration tests
│   └── .env.example
├── docs/screenshots/
├── scripts/dev.mjs           Runs API + Vite together
├── render.yaml               Render Blueprint
└── package.json              Convenience scripts
```

## Quick start (local)

### Prerequisites

- Node.js **20 or newer** and npm
- MongoDB **6 or newer** running locally, **or** a free MongoDB Atlas cluster

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure the server

```bash
# Windows
copy server\.env.example server\.env

# macOS / Linux
cp server/.env.example server/.env
```

Open `server/.env` and set `MONGODB_URI`. A local default is already provided:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/parkspot
```

For Atlas, use the connection string from the Atlas dashboard and include the database name:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/parkspot?retryWrites=true&w=majority
```

Also set a long random `JWT_SECRET`. URL-encode special characters in the Atlas password.

### 3. Seed the database (optional but recommended)

```bash
npm run seed
```

The seed is idempotent: it creates the 24 bays only when the collection is empty, creates the admin if missing, and (when `SEED_DEMO=true`) creates the demo driver and sample bookings.

### 4. Start the app

```bash
npm run dev
```

- Web app: <http://localhost:5173>
- API: <http://localhost:5000>
- Health check: <http://localhost:5000/api/health>

`npm run dev` starts both processes and stops them together. You can also run them in separate terminals with `npm run dev:server` and `npm run dev:client`.

### Production build locally

```bash
npm run build
npm start
# open http://localhost:5000
```

Express serves `client/dist` and falls back to `index.html` for client-side routes such as `/reservations` and `/admin`.

## Demo credentials

These accounts are seeded **only when `SEED_DEMO=true`**, which is the default outside production. `render.yaml` sets it to `false` for a clean deployment.

| Role | Email | Password |
| --- | --- | --- |
| Driver | `demo@parkspot.dev` | `Demo@12345` |
| Admin | `admin@parkspot.dev` | `ADMIN_PASSWORD` (`Admin@12345` by default in development) |

On Render, `ADMIN_PASSWORD` is generated automatically. Copy it from the service's **Environment** tab after the first deploy, then change it to a password you control.

## Environment variables

All server variables live in `server/.env` locally (see `server/.env.example`).

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `5000` | HTTP port. Render injects its own value. |
| `NODE_ENV` | No | `development` | `production` enforces `JWT_SECRET` and disables demo seeding by default. |
| `MONGODB_URI` | **Yes in production** | `mongodb://127.0.0.1:27017/parkspot` | MongoDB connection string. |
| `JWT_SECRET` | **Yes in production** | Dev-only fallback | JWT signing key. Use a long random value. |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime. |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Comma-separated allowed browser origins for cross-origin API calls. |
| `ADMIN_EMAIL` | No | `admin@parkspot.dev` | Admin account created on first startup. |
| `ADMIN_PASSWORD` | No | `Admin@12345` | Password for the seeded admin. Change in production. |
| `ADMIN_NAME` | No | `ParkSpot Admin` | Display name for the seeded admin. |
| `SEED_DEMO` | No | `true` outside production | Create the demo driver and sample bookings. |

In production the server **refuses to start without `JWT_SECRET`**. Render's `generateValue: true` creates one automatically.

## API reference

Base path: `/api`. Protected endpoints expect `Authorization: Bearer <token>`.

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service status, database state, and uptime. |

### Authentication

| Method | Endpoint | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | `{ name, email, password, phone? }` | Create a driver account and return a token. |
| `POST` | `/api/auth/login` | `{ email, password }` | Sign in and return a token. |
| `GET` | `/api/auth/me` | — | Current user profile. |
| `PATCH` | `/api/auth/me` | `{ name?, phone? }` | Update the current profile. |

### Slots

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/slots?start=&end=&type=&level=` | Public | Availability for a window (default: next hour, max 7 days). |
| `GET` | `/api/slots/stats` | Public | Live totals: available/occupied now, levels, price from, type counts. |
| `GET` | `/api/slots/:id` | Public | One slot. |
| `POST` | `/api/slots` | Admin | Create a slot. |
| `PATCH` | `/api/slots/:id` | Admin | Update a slot. |
| `DELETE` | `/api/slots/:id` | Admin | Delete a slot, or archive it when booking history exists. |

### Reservations

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/reservations` | User | `{ slotId, startTime, endTime, vehiclePlate, vehicleType }`. |
| `GET` | `/api/reservations/mine?scope=all\|upcoming\|past\|cancelled` | User | Current user's reservations. |
| `PATCH` | `/api/reservations/:id/cancel` | Owner or admin | Cancel before the start time. |

### Admin

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/admin/stats` | Dashboard KPIs and five most recent reservations. |
| `GET` | `/api/admin/reservations?status=&from=&to=&search=&limit=` | All reservations; search by reference or plate. |
| `GET` | `/api/admin/slots` | All slots, including archived ones. |

Validation errors return `422` with a `details` object. Conflicts (already booked, duplicate email/code) return `409`; missing or unauthorized resources return `404`/`403`.

## Booking rules

- Start time cannot be in the past; minimum duration is **30 minutes**, maximum is **12 hours**.
- Bookings can be made at most **60 days** in advance.
- The vehicle type must match the bay type (`car`, `bike`, or `ev`).
- Availability is an overlap check: an existing active reservation blocks a bay when `existing.start < requested.end` and `existing.end > requested.start`.
- Creation runs inside a per-slot lock and re-checks for conflicts before inserting, which prevents two simultaneous requests from booking the same bay.
- Price = hourly rate × duration in hours, rounded to two decimals.
- Cancellation is allowed only before the start time; admins can cancel any reservation.
- Slots with booking history are archived (`isActive: false`) instead of deleted.

## Tests

```bash
npm test
```

The suite runs 14 API integration tests against an in-memory MongoDB instance. The first run downloads a MongoDB binary, so an internet connection is required. Tests cover:

- Registration, login, duplicate email, and profile access
- Availability filtering and live stats
- Successful booking, pricing, and reference generation
- Double-booking rejection and adjacent-time acceptance
- Validation failures (past dates, duration limits, wrong vehicle type)
- Cancellation permissions and idempotency
- Admin authorization, dashboard stats, reservation search/filtering
- Slot creation, updates, deletion, and archive-on-history

Build sanity check:

```bash
npm run build
```

## Deploy to Render

The repository includes a [`render.yaml`](render.yaml) Blueprint for one Node web service. MongoDB is external (Atlas).

### 1. Create a MongoDB Atlas cluster

1. Create a free **M0** cluster at <https://www.mongodb.com/cloud/atlas>.
2. Under **Database Access**, add a user with a strong password.
3. Under **Network Access**, allow Render. For a quick start use `0.0.0.0/0`; for stricter setups use Render's static outbound IPs (available on paid plans).
4. Copy the connection string and add the database name: `...mongodb.net/parkspot?retryWrites=true&w=majority`.

### 2. Push the project to GitHub

```bash
git init
git add .
git commit -m "Build ParkSpot parking reservation app"
git branch -M main
git remote add origin https://github.com/<your-account>/parkspot.git
git push -u origin main
```

`node_modules`, `client/dist`, and `.env` files are ignored.

### 3. Deploy with the Blueprint (recommended)

1. In the Render Dashboard, choose **New → Blueprint**.
2. Connect the repository; Render detects `render.yaml`.
3. When prompted, paste your `MONGODB_URI`.
4. Apply the Blueprint. Render will:
   - install server dependencies (production only) and client dependencies,
   - build the React app into `client/dist`,
   - start Express with `npm start`,
   - poll `/api/health` for health checks,
   - generate `JWT_SECRET` and `ADMIN_PASSWORD`.
5. Open the service URL (`https://<service-name>.onrender.com`) and sign in as the admin. Retrieve the generated password from **Environment**.

The first boot seeds the 24 bays and the admin account. Demo data is disabled because the Blueprint sets `SEED_DEMO=false`.

### 4. Or configure a web service manually

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci --prefix server --omit=dev && npm ci --prefix client --include=dev && npm run build --prefix client` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Node version | 22.x (`NODE_VERSION=22`; anything >= 20 works) |

Add the environment variables from the table above. At minimum: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`, and `SEED_DEMO=false`.

### Deployment notes

- Render terminates TLS; no certificate setup is required.
- Free instances spin down after inactivity, so the first request may take a few seconds.
- If Atlas blocks the connection, re-check the IP allowlist and URL-encode special characters in the password.
- The in-process booking lock is safe for a **single** instance. If you scale to multiple instances, replace it with a database-level guarantee (MongoDB transactions plus a unique constraint, or an external lock).
- `NODE_ENV=production` is set by the Blueprint. The server will not start without `JWT_SECRET` in that mode.

## Root scripts

| Command | What it does |
| --- | --- |
| `npm run install:all` | Install server and client dependencies. |
| `npm run dev` | Run API and Vite together. |
| `npm run dev:server` | Run only the API with file watching. |
| `npm run dev:client` | Run only Vite. |
| `npm run build` | Build the React app into `client/dist`. |
| `npm start` | Start the production Express server. |
| `npm run seed` | Seed slots and accounts. |
| `npm test` | Run the API integration tests. |

Server-only and client-only scripts are also available inside `server/package.json` and `client/package.json`.

## Security notes

- Passwords are hashed with bcrypt (cost 10) and never returned by the API.
- JWTs are stored in `localStorage`. This is simple for a demo, but an httpOnly cookie with CSRF protection is preferable for a high-security production app.
- Helmet sets sensible security headers; CSP is disabled so the Vite-built SPA can load without a nonce pipeline.
- API-wide rate limit: 600 requests / 15 minutes. Auth endpoints: 40 failed attempts / 15 minutes.
- Request bodies are limited to 100 KB and validated with Zod.
- The admin password is generated by Render in the Blueprint; rotate it after the first login.

## Limitations and next steps

- Payments are calculated and displayed but not processed by a payment gateway.
- No email/SMS confirmations or password recovery.
- "Completed" is derived from the reservation end time; statuses stored are `active` and `cancelled`.
- Availability is computed per request, not pushed over WebSockets.
- The per-slot lock is process-local, so it is intended for a single Render instance.
- The app seeds a fixed set of 24 bays; use the admin console to add more.

## License

Provided as-is for demonstration and educational use.
