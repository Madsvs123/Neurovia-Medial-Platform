/**
 * Backwards-compatible re-export. The real implementation lives in
 * realtime/socket.js (rooms for users / threads / teams, domain-event
 * subscriptions). utils/notify.js imports `emitToUser` from here.
 */
module.exports = require('../realtime/socket');
