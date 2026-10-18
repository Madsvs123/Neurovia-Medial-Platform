const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const isAdminOrEducator = (user) => ['admin', 'educator'].includes(user.role);

// Create an Error carrying an HTTP status that errorMiddleware (err.statusCode) understands
const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

// @desc    Get all messages (for admin/educator dashboard)
// @route   GET /api/messages
// @access  Private/Admin or Educator
const getAllMessages = asyncHandler(async (req, res) => {
    const messages = await Message.find({})
        .populate('sender', 'username email')
        .sort({ createdAt: -1 })
        .limit(100);

    res.json(messages);
});

// @desc    Get messages for a specific conversation
// @route   GET /api/messages/conversation/:conversationId
// @access  Private
const getMessagesByConversation = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
        throw httpError(404, 'Conversation not found');
    }

    // Check authorization
    const isParticipant = conversation.participants.some(
        p => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
        throw httpError(403, 'Not authorized to access this conversation');
    }

    const messages = await Message.find({ conversationId: req.params.conversationId })
        .populate('sender', 'username email')
        .sort({ createdAt: 1 });

    res.json(messages);
});

// @desc    Get message statistics
// @route   GET /api/messages/stats
// @access  Private/Admin or Educator
const getMessageStats = asyncHandler(async (req, res) => {
    const total = await Message.countDocuments();
    const unreadByStaff = await Message.countDocuments({ read: false, senderRole: 'student' });
    const unreadByStudent = await Message.countDocuments({ read: false, senderRole: { $in: ['admin', 'educator'] } });

    res.json({
        total,
        unread: { staff: unreadByStaff, student: unreadByStudent }
    });
});

// @desc    Get message by ID
// @route   GET /api/messages/:id
// @access  Private
const getMessageById = asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id)
        .populate('sender', 'username email');

    if (!message) {
        throw httpError(404, 'Message not found');
    }

    // Check authorization
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
        throw httpError(404, 'Conversation not found');
    }

    const isParticipant = conversation.participants.some(
        p => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
        throw httpError(403, 'Not authorized to access this message');
    }

    res.json(message);
});

// @desc    Mark message as read (only a participant who is not the sender)
// @route   PUT /api/messages/:id/read
// @access  Private
const markMessageAsRead = asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
        throw httpError(404, 'Message not found');
    }

    // A message is "read" when someone other than the sender has read it
    if (message.sender.toString() === req.user._id.toString()) {
        throw httpError(400, 'Cannot mark your own message as read');
    }

    // Requester must be a participant of the message's conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
        throw httpError(404, 'Conversation not found');
    }

    const isParticipant = conversation.participants.some(
        p => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) {
        throw httpError(403, 'Not authorized to access this message');
    }

    message.read = true;
    message.readAt = new Date();
    const updatedMessage = await message.save();
    res.json(updatedMessage);
});

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private (message author, or an admin moderating abuse)
const deleteMessage = asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
        throw httpError(404, 'Message not found');
    }

    // Only the author of the message (or an admin, for moderation) may delete
    // it. Previously ANY participant of the conversation could delete ANY
    // message in it — including messages written by the other party.
    const isAuthor = message.sender.toString() === req.user._id.toString();
    if (!isAuthor && req.user.role !== 'admin') {
        throw httpError(403, 'Not authorized to delete this message');
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participants.some(
        p => p.toString() === req.user._id.toString()
    )) {
        throw httpError(403, 'Not authorized to delete this message');
    }

    // Update conversation message count
    if (conversation) {
        conversation.messageCount = Math.max(0, conversation.messageCount - 1);
        await conversation.save();
    }

    await message.deleteOne();
    res.json({ message: 'Message removed' });
});

module.exports = {
    getAllMessages,
    getMessagesByConversation,
    getMessageStats,
    getMessageById,
    markMessageAsRead,
    deleteMessage
};
