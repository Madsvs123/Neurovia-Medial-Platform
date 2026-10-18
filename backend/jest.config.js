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
    'controllers/conversationController.js',
    'controllers/messageController.js',
    'utils/conversationPolicy.js',
    'routes/conversationRoutes.js',
    'routes/messageRoutes.js',
  ],
};
