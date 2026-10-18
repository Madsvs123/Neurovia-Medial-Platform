/**
 * Shared helpers for API integration tests.
 * Requires a running MongoDB at TEST_MONGODB_URI (default mongodb://127.0.0.1:27017/neurovia_test).
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/neurovia_test';
process.env.RATE_LIMIT_MAX = '100000';
process.env.POLLING_RATE_LIMIT_MAX = '100000';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const app = require('../server');
const User = require('../models/User');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const Notification = require('../models/Notification');

const connect = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
};

const clearDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map(c => c.deleteMany({})));
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

let counter = 0;
const makeUser = async (role, overrides = {}) => {
  counter += 1;
  const user = await User.create({
    username: `${role}${counter}`,
    email: `${role}${counter}@test.local`,
    passwordHash: 'password123',
    role,
    status: 'active',
    ...overrides,
  });
  user.token = tokenFor(user);
  return user;
};

const makeProgram = async (owner, { educators = [], createdBy } = {}) => {
  counter += 1;
  return Program.create({
    title: `Program ${counter}`,
    description: 'test',
    code: `PRG${counter}`,
    programType: 'free_access',
    createdBy: createdBy || owner._id,
    owner: owner._id,
    ownerType: owner.role === 'educator' ? 'educator' : 'site',
    educators,
  });
};

const enroll = (student, program) => ProgramEnrollment.create({ userId: student._id, programId: program._id });

const as = (user) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${user.token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${user.token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${user.token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${user.token}`),
});

const notificationsFor = (user) => Notification.find({ userId: user._id }).sort({ createdAt: 1 });

module.exports = { app, connect, clearDb, disconnect, makeUser, makeProgram, enroll, as, notificationsFor, mongoose };
