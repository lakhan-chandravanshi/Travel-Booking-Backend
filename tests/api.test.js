/**
 * End-to-end API tests.
 *
 * Spins up an in-memory MongoDB (auto-downloaded once by mongodb-memory-server)
 * and drives the real Express app with supertest. To run against an existing
 * database instead, set MONGODB_URI before running:
 *
 *   MONGODB_URI=mongodb://127.0.0.1:27017/travel-test npm test
 *
 * Uses the built-in Node test runner — no extra framework required.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';

let mongod;
let app;

before(async () => {
  if (!process.env.MONGODB_URI) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
  }
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.AI_PROVIDER = 'mock';
  process.env.NODE_ENV = 'test';

  await mongoose.connect(process.env.MONGODB_URI);
  ({ default: app } = await import('../src/app.js'));
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });
let token;
let itineraryId;
let shareSlug;

test('GET /health reports status', async () => {
  const r = await request(app).get('/api/v1/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
});

test('register creates a user and returns a token', async () => {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Asha Rao', email: 'asha@example.com', password: 'secret123' });
  assert.equal(r.status, 201);
  assert.ok(r.body.data.token);
  assert.equal(r.body.data.user.password, undefined, 'password must not be returned');
  token = r.body.data.token;
});

test('duplicate email is rejected with 409', async () => {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Asha', email: 'asha@example.com', password: 'secret123' });
  assert.equal(r.status, 409);
});

test('invalid registration payload returns validation details', async () => {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'x', email: 'not-an-email', password: '1' });
  assert.equal(r.status, 400);
  assert.ok(Array.isArray(r.body.details) && r.body.details.length > 0);
});

test('login succeeds with correct credentials and fails otherwise', async () => {
  const good = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'asha@example.com', password: 'secret123' });
  assert.equal(good.status, 200);

  const bad = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'asha@example.com', password: 'wrong' });
  assert.equal(bad.status, 401);
});

test('protected routes require a token', async () => {
  const r = await request(app).get('/api/v1/bookings');
  assert.equal(r.status, 401);
});

test('upload extracts data from multiple documents', async () => {
  const pdf = Buffer.from('%PDF-1.4 IndiGo flight boarding gate PNR ABC123');
  const img = Buffer.from('hotel Taj Resort check-in 4 nights room');
  const r = await request(app)
    .post('/api/v1/bookings/upload')
    .set(auth(token))
    .attach('files', pdf, { filename: 'flight.pdf', contentType: 'application/pdf' })
    .attach('files', img, { filename: 'hotel.png', contentType: 'image/png' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.bookings.length, 2);
  assert.ok(r.body.data.bookings.every((b) => b.status === 'extracted'));
  assert.ok(r.body.data.bookings.some((b) => b.documentType === 'flight'));
});

test('unsupported file types are rejected', async () => {
  const r = await request(app)
    .post('/api/v1/bookings/upload')
    .set(auth(token))
    .attach('files', Buffer.from('hi'), { filename: 'note.txt', contentType: 'text/plain' });
  assert.equal(r.status, 400);
});

test('itinerary is generated from processed bookings', async () => {
  const r = await request(app).post('/api/v1/itineraries/generate').set(auth(token)).send({});
  assert.equal(r.status, 201);
  assert.ok(r.body.data.itinerary.days.length > 0);
  itineraryId = r.body.data.itinerary._id;
});

test('history lists the generated itinerary', async () => {
  const r = await request(app).get('/api/v1/itineraries').set(auth(token));
  assert.equal(r.status, 200);
  assert.equal(r.body.data.itineraries.length, 1);
});

test('itinerary can be updated and shared, then viewed publicly', async () => {
  const upd = await request(app)
    .patch(`/api/v1/itineraries/${itineraryId}`)
    .set(auth(token))
    .send({ title: 'My Goa Escape' });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.data.itinerary.title, 'My Goa Escape');

  const share = await request(app)
    .post(`/api/v1/itineraries/${itineraryId}/share`)
    .set(auth(token))
    .send({ isPublic: true });
  assert.equal(share.status, 200);
  assert.ok(share.body.data.slug);
  shareSlug = share.body.data.slug;

  const pub = await request(app).get(`/api/v1/public/itineraries/${shareSlug}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.data.itinerary.title, 'My Goa Escape');
  assert.equal(pub.body.data.itinerary.user.name, 'Asha Rao');
});

test('private itinerary is not publicly accessible', async () => {
  await request(app)
    .post(`/api/v1/itineraries/${itineraryId}/share`)
    .set(auth(token))
    .send({ isPublic: false });
  const r = await request(app).get(`/api/v1/public/itineraries/${shareSlug}`);
  assert.equal(r.status, 404);
});

test('users cannot access each other\'s itineraries', async () => {
  const other = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Bob', email: 'bob@example.com', password: 'secret123' });
  const r = await request(app)
    .get(`/api/v1/itineraries/${itineraryId}`)
    .set(auth(other.body.data.token));
  assert.equal(r.status, 404);
});
