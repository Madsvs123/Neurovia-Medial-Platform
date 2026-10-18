// bcrypt is a native module; when its prebuilt binary is unavailable in the
// test environment, transparently fall back to the pure-JS drop-in.
let bcryptAvailable = true;
try { require('bcrypt'); } catch { bcryptAvailable = false; }

module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  roots: ['<rootDir>/tests'],
  moduleNameMapper: bcryptAvailable ? {} : { '^bcrypt$': 'bcryptjs' },
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    'realtime/**/*.js',
    'middleware/**/*.js',
  ],
};
