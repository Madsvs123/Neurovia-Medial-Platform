const { EventEmitter } = require('events');

/**
 * Domain events emitted by the messaging services. Subscribers
 * (notifications, realtime/socket) react to these; services never talk to
 * sockets or the Notification model directly.
 *
 *  thread.created   { thread, actor, candidateIds }
 *  thread.updated   { thread, actor, changes }      (status/assignee/priority/participants)
 *  message.created  { thread, message, actor }
 *  message.updated  { thread, message, actor }
 *  thread.escalated { thread, child, actor }
 *  thread.read      { thread, userId, at }
 *  typing           { threadId, userId, isTyping }  (forwarded from sockets)
 */
class MessagingEvents extends EventEmitter {}

const bus = new MessagingEvents();
bus.setMaxListeners(50);

// A throwing subscriber must never break the request that emitted the event.
const safeEmit = (event, payload) => {
  try {
    bus.emit(event, payload);
  } catch (err) {
     
    console.error(`[messagingEvents] subscriber for "${event}" failed:`, err.message);
  }
};

module.exports = { bus, safeEmit };
