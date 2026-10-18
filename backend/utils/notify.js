const Notification = require('../models/Notification');
const { emitToUser } = require('../realtime/socket');

/**
 * Create a notification for a user and log it.
 * Returns the created notification or null on error (never throws).
 */
async function notify({
  userId,         // required — target user ObjectId or string
  title,          // required — short title
  message,        // required — body
  type,           // required — one of the Notification schema enum
  link = null,    // optional — frontend route to navigate to on click
  entityType = null,  // optional — e.g. 'course', 'clinical_case'
  entityId = null,     // optional — linked entity ObjectId
  actorId = null,      // optional — who performed the action
}) {
  try {
    if (!userId || !title || !message || !type) {
      console.warn('[notify] Missing required fields:', { userId, title, message, type });
      return null;
    }

    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      link,
      entityType,
      entityId,
      actorId,
    });

    // Push it over the socket so the bell updates instantly; REST polling
    // remains as a fallback if the client isn't connected.
    emitToUser(userId, 'notification:new', notification);

    return notification;
  } catch (err) {
    console.error('[notify] Error creating notification:', err.message);
    return null;
  }
}

/**
 * Notify multiple users at once.
 */
async function notifyMany(users, notificationTemplate) {
  const results = [];
  for (const user of users) {
    const n = await notify({ ...notificationTemplate, userId: user._id || user });
    if (n) results.push(n);
  }
  return results;
}

module.exports = { notify, notifyMany };
