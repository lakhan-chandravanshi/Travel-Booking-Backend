# Travel Booking API ✈️

The backend for **Trrip** — a MERN + AI application that turns uploaded travel
documents (flight tickets, hotel bookings, train/bus tickets…) into a smart,
shareable, day-by-day itinerary.

Built with **Node.js · Express · MongoDB (Mongoose)**, JWT auth, **AWS S3**
document storage, and a pluggable **AI layer** (Google Gemini / OpenAI, with a
zero-key mock mode for instant demos).

> Frontend repo: **Travel-Booking-UI** (React + Vite + Tailwind).

---

## ✨ Features

- **JWT authentication** — register / login / current-user, bcrypt-hashed passwords, rate-limited credential endpoints.
- **Document upload** — multipart upload of up to 8 PDFs/images, streamed to **AWS S3** (transparent local-disk fallback when S3 isn't configured).
- **AI data extraction** — each document is parsed (pdf-parse) and read by a multimodal model that returns structured booking data (route, dates, provider, confirmation no., price…).
- **AI itinerary generation** — all of a user's bookings are composed into a chronological, day-by-day plan with tips and a packing list.
- **History** — every generated itinerary is stored per-user and listable.
- **Sharing** — flip an itinerary public to get a tokenised link (`/trip/:slug`) with a view counter; revoke any time.
- **Production-minded** — Helmet, CORS allow-list, global + per-route rate limiting, centralised error handling, graceful shutdown, health endpoint.

---

## 🧱 Architecture & folder structure

A clean, layered separation of concerns — routes → controllers → services → models.

```
src/
├── config/          # env validation, db & connection setup
│   ├── env.js
│   └── db.js
├── models/          # Mongoose schemas
│   ├── User.js
│   ├── Booking.js   # an uploaded document + its extracted data
│   └── Itinerary.js # the generated trip (days, tips, sharing)
├── controllers/     # request handlers (thin)
│   ├── auth.controller.js
│   ├── booking.controller.js
│   └── itinerary.controller.js
├── services/        # business logic (reusable, testable)
│   ├── storage.service.js     # S3 upload/delete (+ local fallback)
│   ├── extraction.service.js  # PDF/text extraction
│   └── ai/                    # pluggable AI providers
│       ├── index.js           # provider selector + graceful degrade
│       ├── gemini.js
│       ├── openai.js
│       ├── mock.js            # key-free, fully functional demo provider
│       └── prompts.js
├── middleware/      # auth, upload (multer), validation (zod), errors
├── routes/          # express routers, composed in routes/index.js
├── validators/      # zod request schemas
├── utils/           # logger, ApiError, asyncHandler, token
├── scripts/seed.js  # demo data seeder
├── app.js           # express app (middleware + routes)
└── server.js        # bootstrap (db connect + listen)
```

**Design choices**

- **Service layer** keeps controllers thin and the AI/storage concerns swappable.
- **Provider abstraction** (`services/ai`) means switching Gemini ↔ OpenAI ↔ mock is a single env var; if a key is missing the app *degrades to mock* rather than crashing.
- **Uploads never block on AI** — the booking row is persisted first, then extraction runs; a failed extraction marks the row `failed` without losing the file.
- **Consistent API envelope** — every response is `{ success, data?, message?, details? }`.

---

## 🗄️ Data model

| Collection   | Key fields |
|--------------|-----------|
| **users**       | name, email (unique), password (hashed, never serialised), avatarColor |
| **bookings**    | user, file{Name,Url,Key,Type,Size,storage}, documentType, status (`processing`/`extracted`/`failed`), `extractedData{ type, provider, from, to, startDateTime, endDateTime, price, … }` |
| **itineraries** | user, title, destination, summary, start/endDate, `days[]{ dayNumber, date, items[]{ time, type, title, description, location } }`, tips[], packingList[], `share{ isPublic, slug, views }` |

---

## 🔌 API reference

Base URL: `/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/health` | – | Service status, active AI provider & storage mode |
| POST | `/auth/register` | – | Create account → `{ user, token }` |
| POST | `/auth/login` | – | Log in → `{ user, token }` |
| GET  | `/auth/me` | ✅ | Current user |
| POST | `/bookings/upload` | ✅ | Multipart `files[]` → upload + AI extraction |
| GET  | `/bookings` | ✅ | List your uploaded bookings |
| GET  | `/bookings/:id` | ✅ | One booking |
| DELETE | `/bookings/:id` | ✅ | Delete booking (+ stored file) |
| POST | `/itineraries/generate` | ✅ | Generate itinerary from bookings (`{ bookingIds?, title? }`) |
| GET  | `/itineraries` | ✅ | History (list) |
| GET  | `/itineraries/:id` | ✅ | Full itinerary |
| PATCH | `/itineraries/:id` | ✅ | Edit title / summary / tags / emoji |
| DELETE | `/itineraries/:id` | ✅ | Delete |
| POST | `/itineraries/:id/share` | ✅ | `{ isPublic }` → toggle public link |
| GET  | `/public/itineraries/:slug` | – | View a shared itinerary |

Auth header: `Authorization: Bearer <token>`.

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js ≥ 18
- MongoDB (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

### 2. Install & configure
```bash
npm install
cp .env.example .env      # then edit values
```

Minimum to run with **zero external keys** (uses mock AI + local file storage):
```env
MONGODB_URI=mongodb://127.0.0.1:27017/travel-booking
JWT_SECRET=any-long-random-string
AI_PROVIDER=mock
```

To use real AI, set `AI_PROVIDER=gemini` (+ `GEMINI_API_KEY`) or
`AI_PROVIDER=openai` (+ `OPENAI_API_KEY`). To store files in S3, fill the
`AWS_*` block — otherwise uploads are saved to `./uploads` and served at
`/uploads/...`.

### 3. Run
```bash
npm run dev      # watch mode (nodemon)
npm start        # production
npm run seed     # optional: create demo@trrip.app / demo1234 + sample trip
```

API runs on `http://localhost:5000`. Verify: `curl localhost:5000/api/v1/health`.

### 4. Test
```bash
npm test         # spins up an in-memory MongoDB and drives the real API
```

---

## ☁️ AWS S3 setup (bonus feature)

1. Create an S3 bucket (e.g. `travel-booking-uploads`).
2. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on that bucket.
3. Put the credentials + bucket/region into `.env` (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`).
4. (Optional) Front the bucket with CloudFront and set `AWS_S3_PUBLIC_URL`.

The app auto-detects S3: present → uploads go to the bucket; absent → local disk fallback. The chosen strategy is recorded on every booking.

---

## 🌍 Deployment

Deploy anywhere that runs Node (Render, Railway, Fly.io, a VM, or the included `Dockerfile`).

- Set all env vars from `.env.example` in the host's dashboard.
- Set `CLIENT_URL` to your deployed frontend origin (CORS allow-list; comma-separate multiple).
- Point `MONGODB_URI` at MongoDB Atlas.
- `npm start` (or `docker build -t travel-api . && docker run -p 5000:5000 travel-api`).

---

## 🛡️ Security notes
- Passwords hashed with bcrypt; never returned in any response.
- JWT in `Authorization` header; secret + expiry are env-configured.
- Helmet headers, CORS origin allow-list, request-size limits, and rate limiting on the API and auth routes.
- File uploads are type- and size-restricted (PDF/images, ≤ 15 MB, ≤ 8 files).
