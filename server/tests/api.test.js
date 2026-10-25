import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Reservation } from '../src/models/Reservation.js';
import { Slot } from '../src/models/Slot.js';
import { User } from '../src/models/User.js';
import { seedDatabase } from '../src/utils/seed.js';

let mongo;
let app;
let counter = 0;

const silentLogger = { info() {}, warn() {}, error() {} };

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function futureWindow(dayOffset = 2, startHour = 10, hours = 2) {
  const start = new Date();
  start.setDate(start.getDate() + dayOffset);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return { start, end };
}

async function registerUser(overrides = {}) {
  counter += 1;
  const email = `driver-${counter}-${Date.now()}@test.dev`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test Driver',
      email,
      password: 'Passw0rd1',
      ...overrides,
    });
  assert.equal(response.status, 201, response.text);
  return { ...response.body, email };
}

async function loginAdmin() {
  counter += 1;
  const email = `admin-${counter}-${Date.now()}@test.dev`;
  await User.create({
    name: 'Test Admin',
    email,
    passwordHash: await User.hashPassword('AdminPass1'),
    role: 'admin',
  });
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'AdminPass1' });
  assert.equal(response.status, 200, response.text);
  return response.body;
}

before(async () => {
  mongo = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 },
  });
  await connectDB(mongo.getUri());
  await seedDatabase({ logger: silentLogger });
  app = createApp({ enableRateLimit: false });
});

beforeEach(async () => {
  await Reservation.deleteMany({});
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
  await mongo.stop();
});

describe('health', () => {
  it('reports the API and database as healthy', async () => {
    const response = await request(app).get('/api/health');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.database, 'connected');
  });
});

describe('authentication', () => {
  it('registers, signs in and returns the current user', async () => {
    const registered = await registerUser({ name: 'Alex Morgan' });
    assert.ok(registered.token);
    assert.equal(registered.user.name, 'Alex Morgan');
    assert.equal(registered.user.role, 'user');
    assert.equal(registered.user.passwordHash, undefined);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registered.email, password: 'Passw0rd1' });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);

    const me = await request(app).get('/api/auth/me').set(auth(registered.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, registered.email.toLowerCase());
  });

  it('rejects bad passwords and duplicate emails', async () => {
    const registered = await registerUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: registered.email, password: 'WrongPass123' });
    assert.equal(wrongPassword.status, 401);

    const duplicate = await request(app).post('/api/auth/register').send({
      name: 'Copy Cat',
      email: registered.email,
      password: 'Passw0rd1',
    });
    assert.equal(duplicate.status, 409);
  });

  it('validates registration input and protected routes', async () => {
    const weak = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });
    assert.equal(weak.status, 422);
    assert.ok(weak.body.details);

    const unauthorised = await request(app).get('/api/auth/me');
    assert.equal(unauthorised.status, 401);
  });
});

describe('slots and availability', () => {
  it('lists seeded bays with live availability metadata', async () => {
    const { start, end } = futureWindow();
    const response = await request(app).get(
      `/api/slots?start=${start.toISOString()}&end=${end.toISOString()}&type=car`,
    );

    assert.equal(response.status, 200);
    assert.ok(response.body.slots.length > 0);
    assert.equal(response.body.meta.total, response.body.slots.length);
    assert.equal(response.body.meta.available, response.body.meta.total);
    assert.ok(response.body.slots.every((slot) => slot.type === 'car' && slot.available));

    const stats = await request(app).get('/api/slots/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.stats.totalSlots, 24);
    assert.ok(stats.body.stats.availableNow > 0);
  });

  it('rejects an inverted availability window', async () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() - 60 * 60 * 1000);
    const response = await request(app).get(
      `/api/slots?start=${start.toISOString()}&end=${end.toISOString()}`,
    );
    assert.equal(response.status, 422);
  });
});

describe('reservations', () => {
  it('creates a reservation and computes the price on the server', async () => {
    const user = await registerUser();
    const slot = await Slot.findOne({ code: 'A-01' });
    const { start, end } = futureWindow(2, 10, 2);

    const response = await request(app)
      .post('/api/reservations')
      .set(auth(user.token))
      .send({
        slotId: slot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'test 123',
        vehicleType: 'car',
        totalPrice: 0.01,
      });

    assert.equal(response.status, 201, response.text);
    const reservation = response.body.reservation;
    assert.equal(reservation.totalPrice, 5);
    assert.equal(reservation.vehiclePlate, 'TEST 123');
    assert.equal(reservation.status, 'active');
    assert.equal(reservation.slot.code, 'A-01');
    assert.match(reservation.reference, /^PS-[A-Z0-9]{6}$/);
  });

  it('prevents double-booking overlapping windows but allows adjacent ones', async () => {
    const first = await registerUser();
    const second = await registerUser();
    const slot = await Slot.findOne({ code: 'A-01' });
    const { start, end } = futureWindow(3, 9, 2);

    const initial = await request(app)
      .post('/api/reservations')
      .set(auth(first.token))
      .send({
        slotId: slot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'FIRST 1',
        vehicleType: 'car',
      });
    assert.equal(initial.status, 201, initial.text);

    const overlapping = await request(app)
      .post('/api/reservations')
      .set(auth(second.token))
      .send({
        slotId: slot.id,
        startTime: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
        endTime: new Date(end.getTime() + 30 * 60 * 1000).toISOString(),
        vehiclePlate: 'SECOND 2',
        vehicleType: 'car',
      });
    assert.equal(overlapping.status, 409);

    const adjacent = await request(app)
      .post('/api/reservations')
      .set(auth(second.token))
      .send({
        slotId: slot.id,
        startTime: end.toISOString(),
        endTime: new Date(end.getTime() + 60 * 60 * 1000).toISOString(),
        vehiclePlate: 'SECOND 2',
        vehicleType: 'car',
      });
    assert.equal(adjacent.status, 201, adjacent.text);

    const availability = await request(app).get(
      `/api/slots?start=${start.toISOString()}&end=${end.toISOString()}&type=car`,
    );
    const listed = availability.body.slots.find((item) => item.code === 'A-01');
    assert.equal(listed.available, false);
  });

  it('rejects past, too-long and wrong-vehicle reservations', async () => {
    const user = await registerUser();
    const carSlot = await Slot.findOne({ code: 'A-03' });
    const bikeSlot = await Slot.findOne({ code: 'C-01' });
    const { start, end } = futureWindow(2, 12, 2);

    const past = await request(app)
      .post('/api/reservations')
      .set(auth(user.token))
      .send({
        slotId: carSlot.id,
        startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        vehiclePlate: 'PAST 1',
        vehicleType: 'car',
      });
    assert.equal(past.status, 422);

    const tooLong = await request(app)
      .post('/api/reservations')
      .set(auth(user.token))
      .send({
        slotId: carSlot.id,
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 13 * 60 * 60 * 1000).toISOString(),
        vehiclePlate: 'LONG 1',
        vehicleType: 'car',
      });
    assert.equal(tooLong.status, 422);

    const wrongVehicle = await request(app)
      .post('/api/reservations')
      .set(auth(user.token))
      .send({
        slotId: bikeSlot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'CAR 1',
        vehicleType: 'car',
      });
    assert.equal(wrongVehicle.status, 422);

    const missingSlot = await request(app)
      .post('/api/reservations')
      .set(auth(user.token))
      .send({
        slotId: new mongoose.Types.ObjectId().toString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'NONE 1',
        vehicleType: 'car',
      });
    assert.equal(missingSlot.status, 404);
  });

  it('only lets the owner cancel and frees the bay afterwards', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const slot = await Slot.findOne({ code: 'A-04' });
    const { start, end } = futureWindow(4, 8, 2);

    const created = await request(app)
      .post('/api/reservations')
      .set(auth(owner.token))
      .send({
        slotId: slot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'OWNER 1',
        vehicleType: 'car',
      });
    assert.equal(created.status, 201, created.text);
    const reservationId = created.body.reservation.id;

    const forbidden = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set(auth(other.token));
    assert.equal(forbidden.status, 403);

    const cancelled = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set(auth(owner.token));
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.reservation.status, 'cancelled');

    const again = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set(auth(owner.token));
    assert.equal(again.status, 409);

    const availability = await request(app).get(
      `/api/slots?start=${start.toISOString()}&end=${end.toISOString()}&type=car`,
    );
    assert.equal(
      availability.body.slots.find((item) => item.code === 'A-04').available,
      true,
    );
  });

  it('returns upcoming and past bookings separately', async () => {
    const user = await registerUser();
    const slot = await Slot.findOne({ code: 'B-06' });
    const { start, end } = futureWindow(5, 15, 1);

    await request(app)
      .post('/api/reservations')
      .set(auth(user.token))
      .send({
        slotId: slot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'UP 1',
        vehicleType: 'car',
      })
      .expect(201);

    const upcoming = await request(app)
      .get('/api/reservations/mine?scope=upcoming')
      .set(auth(user.token));
    assert.equal(upcoming.status, 200);
    assert.equal(upcoming.body.reservations.length, 1);

    const past = await request(app)
      .get('/api/reservations/mine?scope=past')
      .set(auth(user.token));
    assert.equal(past.body.reservations.length, 0);
  });
});

describe('admin', () => {
  it('protects admin routes and exposes stats', async () => {
    const driver = await registerUser();
    const forbidden = await request(app)
      .get('/api/admin/stats')
      .set(auth(driver.token));
    assert.equal(forbidden.status, 403);

    const admin = await loginAdmin();
    const stats = await request(app).get('/api/admin/stats').set(auth(admin.token));
    assert.equal(stats.status, 200);
    assert.equal(stats.body.stats.totalSlots, 24);
    assert.equal(typeof stats.body.stats.revenue, 'number');
    assert.ok(Array.isArray(stats.body.recentReservations));
  });

  it('creates a bay, archives it once it has history, and rejects bad input', async () => {
    const admin = await loginAdmin();

    const created = await request(app)
      .post('/api/slots')
      .set(auth(admin.token))
      .send({
        code: 'T-99',
        level: 'Test level',
        zone: 'premium',
        type: 'car',
        pricePerHour: 3.25,
        features: ['Test bay', 'CCTV'],
      });
    assert.equal(created.status, 201, created.text);
    assert.equal(created.body.slot.code, 'T-99');
    assert.equal(created.body.slot.pricePerHour, 3.25);

    const duplicate = await request(app)
      .post('/api/slots')
      .set(auth(admin.token))
      .send({ code: 'T-99', level: 'Test level', pricePerHour: 2 });
    assert.equal(duplicate.status, 409);

    const bad = await request(app)
      .post('/api/slots')
      .set(auth(admin.token))
      .send({ code: '', level: '', pricePerHour: -5 });
    assert.equal(bad.status, 422);

    const driver = await registerUser();
    const { start, end } = futureWindow(6, 11, 2);
    await request(app)
      .post('/api/reservations')
      .set(auth(driver.token))
      .send({
        slotId: created.body.slot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'ARCHIVE 1',
        vehicleType: 'car',
      })
      .expect(201);

    const archived = await request(app)
      .delete(`/api/slots/${created.body.slot.id}`)
      .set(auth(admin.token));
    assert.equal(archived.status, 200);
    assert.equal(archived.body.archived, true);

    const allSlots = await request(app).get('/api/admin/slots').set(auth(admin.token));
    const archivedSlot = allSlots.body.slots.find((slot) => slot.code === 'T-99');
    assert.equal(archivedSlot.isActive, false);

    const publicList = await request(app).get(
      `/api/slots?start=${start.toISOString()}&end=${end.toISOString()}`,
    );
    assert.equal(publicList.body.slots.some((slot) => slot.code === 'T-99'), false);
  });

  it('lets admins filter reservations and cancel before the start time', async () => {
    const admin = await loginAdmin();
    const driver = await registerUser();
    const slot = await Slot.findOne({ code: 'B-02' });
    const { start, end } = futureWindow(7, 16, 1);

    const booking = await request(app)
      .post('/api/reservations')
      .set(auth(driver.token))
      .send({
        slotId: slot.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        vehiclePlate: 'ADMIN 1',
        vehicleType: 'car',
      });
    assert.equal(booking.status, 201, booking.text);

    const list = await request(app)
      .get('/api/admin/reservations?status=active&search=ADMIN')
      .set(auth(admin.token));
    assert.equal(list.status, 200);
    assert.equal(list.body.reservations.length, 1);
    assert.equal(list.body.reservations[0].user.email, driver.email.toLowerCase());

    const cancel = await request(app)
      .patch(`/api/reservations/${booking.body.reservation.id}/cancel`)
      .set(auth(admin.token));
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.reservation.status, 'cancelled');
  });
});
