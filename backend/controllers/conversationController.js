const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const { notify } = require('../utils/notify');
const { emitToUser, emitToUsers, emitToStaff } = require('../utils/socket');

const isAdmin = (user) => user.role === 'admin';
const isAdminOrEducator = (user) => ['admin', 'educator'].includes(user.role);
const senderRole = (user) => user.role === 'admin' ? 'admin' : (user.role === 'educator' ? 'educator' : 'student');

// Public-facing fields for any user embedded in a conversation/message
// payload. `name` does NOT exist on the User model (only `username`) — an
// earlier version of this controller populated `name`, which silently
// produced empty sender names everywhere.
const PUBLIC_USER_FIELDS = 'username email role status avatar';

// Categories an educator is allowed to see/handle. Billing is admin-only —
// educators have no business issuing refunds or discussing payments.
const EDUCATOR_BLOCKED_CATEGORIES = ['billing'];

// Create an Error carrying an HTTP status that errorMiddleware (err.statusCode) understands
const httpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

/** Role-aware deep link so notification bells/emails land on a page that actually exists. */
const notifyLinkFor = (role, conversationId) => {
    if (role === 'admin') return `/admin/conversations/${conversationId}`;
    if (role === 'educator') return `/educator/conversations/${conversationId}`;
    // Students have no standalone conversation route — the floating support
    // widget opens itself to the right thread from this query param.
    return `/support?conversationId=${conversationId}`;
};

/**
 * Ids an educator is allowed to start/accept conversations with: students
 * enrolled in a program they own or are assigned to, plus other educators
 * (collegial contact). Returns `null` for admins, meaning "no restriction".
 */
const getAllowedRecipientIds = async (user) => {
    if (isAdmin(user)) return null;

    const myProgramIds = await Program.find({
        $or: [{ owner: user._id }, { educators: user._id }]
    }).distinct('_id');

    const myStudentIds = myProgramIds.length
        ? await ProgramEnrollment.find({ programId: { $in: myProgramIds } }).distinct('userId')
        : [];

    const otherEducatorIds = await User.find({ role: 'educator', _id: { $ne: user._id } }).distinct('_id');

    return new Set([...myStudentIds, ...otherEducatorIds].map(id => id.toString()));
};

// Enrich conversation objects with:
//  - unreadCount: messages in the conversation where read=false and sender != requester
//  - otherParticipant: the populated participant that is not the requester (null for solo)
// Uses a single grouped count query keyed by conversationId (no N+1 queries).
const attachConversationMeta = async (conversations, requesterId) => {
    const requesterIdStr = requesterId.toString();
    const ids = conversations.map(c => c._id);

    const unreadCounts = ids.length === 0 ? [] : await Message.aggregate([
        {
            $match: {
                conversationId: { $in: ids },
                sender: { $ne: new mongoose.Types.ObjectId(requesterIdStr) },
                read: false
            }
        },
        { $group: { _id: '$conversationId', count: { $sum: 1 } } }
    ]);

    const unreadMap = new Map(unreadCounts.map(u => [u._id.toString(), u.count]));

    return conversations.map(c => {
        const obj = c.toObject ? c.toObject() : c;
        obj.unreadCount = unreadMap.get(obj._id.toString()) || 0;
        const others = (obj.participants || []).filter(
            p => p && p._id && p._id.toString() !== requesterIdStr
        );
        obj.otherParticipant = others.length > 0 ? others[0] : null;
        return obj;
    });
};

/** True once every current participant has soft-deleted the conversation. */
const isDeletedForEveryone = (conversation) => {
    const deletedSet = new Set((conversation.deletedFor || []).map(id => id.toString()));
    return (conversation.participants || []).every(p => deletedSet.has(p.toString()));
};

// @desc    Get all conversations (participant-scoped), or — for admins only —
//          every conversation on the platform when `?all=true` is passed,
//          for oversight/auditing purposes.
// @route   GET /api/conversations
// @access  Private/Admin or Participant
const getConversations = asyncHandler(async (req, res) => {
    try {
        let conversations;
        const wantsAll = ['true', '1'].includes(String(req.query.all).toLowerCase());

        if (isAdmin(req.user) && wantsAll) {
            // Platform-wide oversight view. Admins still need to `join` a
            // conversation before they can read its messages or act on it —
            // this only exposes metadata (subject, status, participants).
            conversations = await Conversation.find({})
                .populate('participants', PUBLIC_USER_FIELDS)
                .populate('assignedTo', PUBLIC_USER_FIELDS)
                .sort({ lastMessageAt: -1 })
                .limit(500);
        } else if (isAdmin(req.user)) {
            // Admin's own inbox: only conversations they are assigned/participating in
            conversations = await Conversation.find({
                participants: new mongoose.Types.ObjectId(req.user._id),
                deletedFor: { $ne: new mongoose.Types.ObjectId(req.user._id) }
            })
                .populate('participants', PUBLIC_USER_FIELDS)
                .populate('assignedTo', PUBLIC_USER_FIELDS)
                .sort({ lastMessageAt: -1 });
        } else if (req.user.role === 'educator') {
            // Educator sees ONLY conversations they're participating in
            conversations = await Conversation.find({
                participants: new mongoose.Types.ObjectId(req.user._id),
                deletedFor: { $ne: new mongoose.Types.ObjectId(req.user._id) }
            })
                .populate('participants', PUBLIC_USER_FIELDS)
                .populate('assignedTo', PUBLIC_USER_FIELDS)
                .sort({ lastMessageAt: -1 });
        } else {
            conversations = await Conversation.aggregate([
                {
                    $match: {
                        participants: new mongoose.Types.ObjectId(req.user._id),
                        deletedFor: { $ne: new mongoose.Types.ObjectId(req.user._id) }
                    }
                },
                {
                    $addFields: {
                        sortOrder: {
                            $switch: {
                                branches: [
                                    { case: { $in: ['$status', ['open', 'pending-admin', 'in-progress']] }, then: 0 },
                                    { case: { $eq: ['$status', 'pending-user'] }, then: 1 },
                                    { case: { $eq: ['$status', 'resolved'] }, then: 2 },
                                ],
                                default: 3
                            }
                        }
                    }
                },
                { $sort: { sortOrder: 1, lastMessageAt: -1 } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'participants',
                        foreignField: '_id',
                        as: 'participants'
                    }
                },
                {
                    $project: {
                        sortOrder: 0,
                        'participants.passwordHash': 0,
                        'participants.refreshToken': 0,
                        'participants.enrolledPrograms': 0,
                        'participants.completedQuizzes': 0,
                        'participants.authProvider': 0,
                        'participants.lastLogin': 0,
                        'participants.verified': 0,
                        'participants.subscriptionPlan': 0
                    }
                }
            ]);
        }

        const enriched = await attachConversationMeta(conversations, req.user._id);
        res.json(enriched);
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to fetch conversations');
    }
});

// @route   GET /api/conversations/my
// @access  Private
const getMyConversations = asyncHandler(async (req, res) => {
    try {
        const conversations = await Conversation.aggregate([
            {
                $match: {
                    participants: new mongoose.Types.ObjectId(req.user._id),
                    deletedFor: { $ne: new mongoose.Types.ObjectId(req.user._id) }
                }
            },
            {
                $addFields: {
                    sortOrder: {
                        $switch: {
                            branches: [
                                { case: { $in: ['$status', ['open', 'pending-admin', 'in-progress']] }, then: 0 },
                                { case: { $eq: ['$status', 'pending-user'] }, then: 1 },
                                { case: { $eq: ['$status', 'resolved'] }, then: 2 },
                            ],
                            default: 3
                        }
                    }
                }
            },
            { $sort: { sortOrder: 1, lastMessageAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participants'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedTo',
                    foreignField: '_id',
                    as: 'assignedTo'
                }
            },
            { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    sortOrder: 0,
                    'participants.passwordHash': 0,
                    'participants.refreshToken': 0,
                    'participants.enrolledPrograms': 0,
                    'participants.completedQuizzes': 0,
                    'participants.authProvider': 0,
                    'participants.lastLogin': 0,
                    'participants.verified': 0,
                    'participants.subscriptionPlan': 0,
                    'assignedTo.passwordHash': 0,
                    'assignedTo.refreshToken': 0
                }
            }
        ]);

        const enriched = await attachConversationMeta(conversations, req.user._id);
        res.json(enriched);
    } catch (error) {
        if (error.statusCode) throw error;
        console.error('Error in getMyConversations:', error);
        res.status(500);
        throw new Error('Failed to fetch conversations');
    }
});

// @desc    Get staff support queue — unassigned open/pending-admin tickets.
//          A ticket drops out of everyone's queue the moment ANY staff
//          member joins it (assignedTo gets set), instead of lingering
//          until that staff member actually replies.
// @route   GET /api/conversations/queue
// @access  Private/Admin or Educator
const getSupportQueue = asyncHandler(async (req, res) => {
    try {
        const filter = {
            participants: { $ne: new mongoose.Types.ObjectId(req.user._id) },
            status: { $in: ['open', 'pending-admin'] },
            assignedTo: null
        };

        // Educators don't handle billing tickets.
        if (req.user.role === 'educator') {
            filter.category = { $nin: EDUCATOR_BLOCKED_CATEGORIES };
        }

        const conversations = await Conversation.find(filter)
            .populate('participants', PUBLIC_USER_FIELDS)
            .sort({ createdAt: 1 });

        const enriched = await attachConversationMeta(conversations, req.user._id);
        res.json(enriched);
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to fetch support queue');
    }
});

// @desc    Get single conversation
// @route   GET /api/conversations/:id
// @access  Private (user must be participant)
const getConversation = asyncHandler(async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id)
            .populate('participants', PUBLIC_USER_FIELDS)
            .populate('assignedTo', PUBLIC_USER_FIELDS);

        if (!conversation) {
            throw httpError(404, 'Conversation not found');
        }

        // Check if user is authorized to view this conversation (must be a participant)
        const isParticipant = conversation.participants.some(
            p => p._id.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            throw httpError(403, 'Not authorized to access this conversation');
        }

        // Soft-deleted for this user: behave as if it no longer exists for them.
        const deletedForMe = (conversation.deletedFor || []).some(
            id => id.toString() === req.user._id.toString()
        );
        if (deletedForMe) {
            throw httpError(404, 'Conversation not found');
        }

        const enriched = await attachConversationMeta([conversation], req.user._id);
        res.json(enriched[0]);
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to fetch conversation');
    }
});

// @desc    Get new conversation form (for admin/educator to start new conversation)
// @route   GET /api/conversations/new
// @access  Private/Admin or Educator
const getNewConversationForm = asyncHandler(async (req, res) => {
    try {
        let users;

        if (isAdmin(req.user)) {
            // Admins support everyone.
            users = await User.find({ role: { $ne: 'admin' }, _id: { $ne: req.user._id } })
                .select('username email role _id status');
        } else {
            // Educators: scope recipients to students enrolled in programs
            // they own/teach, plus other educators for collegial contact.
            const allowedIds = await getAllowedRecipientIds(req.user);
            users = await User.find({
                _id: { $in: Array.from(allowedIds), $ne: req.user._id }
            }).select('username email role _id status');
        }

        res.json({
            users,
            categories: ['general', 'support', 'clinical', 'technical', 'billing', 'other']
        });
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to load new conversation form');
    }
});

// @desc    Create new conversation
// @route   POST /api/conversations
// @access  Private (user, admin, or educator)
const createConversation = asyncHandler(async (req, res) => {
    try {
        const { subject, message, userId, category = 'general' } = req.body;

        if (!subject || !message) {
            throw httpError(400, 'Subject and message are required');
        }

        const isStaff = ['admin', 'educator'].includes(req.user.role);

        let conversationData = {
            subject,
            category,
            participants: [],
            lastMessage: {
                text: message,
                timestamp: new Date(),
                senderId: req.user._id
            },
            lastMessageAt: new Date(),
            messageCount: 1,
            createdBy: req.user._id
        };

        if (isStaff) {
            // Staff must always target a real recipient — an unscoped
            // "solo" ticket created by an admin/educator just pollutes the
            // shared queue with a ticket nobody can actually answer.
            if (!userId) {
                throw httpError(400, 'Please select a recipient to start a conversation.');
            }
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw httpError(400, 'Invalid user ID format');
            }

            const targetUser = await User.findById(userId);
            if (!targetUser) {
                throw httpError(404, 'User not found');
            }
            // Staff conversations must target non-admin users
            if (targetUser.role === 'admin') {
                throw httpError(400, 'Cannot start a conversation with an admin user');
            }
            // Prevent staff from creating a conversation targeting themselves
            if (userId.toString() === req.user._id.toString()) {
                throw httpError(400, 'Cannot start a conversation with yourself');
            }

            // Educators may only contact their own students (or other educators).
            if (req.user.role === 'educator') {
                const allowedIds = await getAllowedRecipientIds(req.user);
                if (!allowedIds.has(userId.toString())) {
                    throw httpError(403, 'You can only message students enrolled in your own programs.');
                }
            }

            conversationData.participants = [userId, req.user._id];
            conversationData.assignedTo = req.user._id;
            conversationData.status = 'pending-user';
        } else {
            conversationData.participants = [req.user._id];
            conversationData.status = 'pending-admin';
        }

        // Create conversation
        const conversation = new Conversation(conversationData);
        const createdConversation = await conversation.save();

        // Create first message
        const role = senderRole(req.user);
        const firstMessage = new Message({
            conversationId: createdConversation._id,
            sender: req.user._id,
            senderRole: role,
            message
        });

        await firstMessage.save();

        // Notify relevant staff if a regular user started the conversation.
        // Educators aren't notified about billing tickets — that's admin-only.
        if (!isStaff) {
            const staffRoles = category === 'billing' ? ['admin'] : ['admin', 'educator'];
            const staffUsers = await User.find({ role: { $in: staffRoles } }).select('_id role');
            const staffIds = [];
            for (const staff of staffUsers) {
                if (staff._id.toString() === req.user._id.toString()) continue;
                staffIds.push(staff._id);
                await notify({
                    userId: staff._id,
                    title: 'New Conversation',
                    message: `${req.user.username || 'A student'} started a new conversation: ${subject}`,
                    type: 'new_conversation',
                    link: notifyLinkFor(staff.role, createdConversation._id),
                    entityType: 'conversation',
                    entityId: createdConversation._id,
                    actorId: req.user._id
                });
            }
            emitToUsers(staffIds, 'conversation:new-ticket', {
                conversationId: createdConversation._id,
                subject,
                category
            });
        } else {
            // Let the recipient know right away.
            emitToUser(userId, 'conversation:created', { conversationId: createdConversation._id });
        }

        res.status(201).json(createdConversation);
    } catch (error) {
        if (error.statusCode) throw error;
        console.error('Error creating conversation:', error);
        res.status(500);
        throw new Error('Failed to create conversation: ' + error.message);
    }
});

// @desc    Update conversation status
// @route   PUT /api/conversations/:id/status
// @access  Private/Admin or Educator (must be a participant of this conversation)
const updateConversationStatus = asyncHandler(async (req, res) => {
    try {
        const { status } = req.body;

        const validStatuses = ['open', 'in-progress', 'resolved', 'pending-admin', 'pending-user', 'closed'];
        if (!validStatuses.includes(status)) {
            throw httpError(400, 'Invalid status');
        }

        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            throw httpError(404, 'Conversation not found');
        }

        // Only admin or educator can update status...
        if (!isAdminOrEducator(req.user)) {
            throw httpError(403, 'Not authorized to update conversation status');
        }
        // ...and only if they've actually joined this specific conversation
        // (prevents any staff member from resolving/reopening tickets they
        // have no relationship to, just by knowing/guessing the ID).
        const isParticipant = conversation.participants.some(
            p => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            throw httpError(403, 'Join this conversation before updating its status');
        }

        conversation.status = status;
        conversation.resolvedAt = ['resolved', 'closed'].includes(status) ? new Date() : null;

        const updatedConversation = await conversation.save();

        emitToUsers(conversation.participants, 'conversation:updated', {
            conversationId: conversation._id,
            status
        });

        res.json(updatedConversation);
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to update conversation status');
    }
});

// @desc    Mark all messages as read in all conversations for current user
// @route   PUT /api/conversations/mark-all-read
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    try {
        // Only messages in conversations where the requester is a participant,
        // and only messages not sent by the requester
        const conversationIds = await Conversation.find({
            participants: new mongoose.Types.ObjectId(req.user._id),
            deletedFor: { $ne: new mongoose.Types.ObjectId(req.user._id) }
        }).distinct('_id');

        const result = await Message.updateMany(
            {
                conversationId: { $in: conversationIds },
                sender: { $ne: req.user._id },
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );
        res.json({ modifiedCount: result.modifiedCount });
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to mark all messages as read');
    }
});

// @desc    Mark all messages in one conversation as read for the current user
// @route   PUT /api/conversations/:id/read
// @access  Private (user must be participant)
const markConversationAsRead = asyncHandler(async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            throw httpError(400, 'Invalid conversation ID format');
        }

        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            throw httpError(404, 'Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            p => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            throw httpError(403, 'Not authorized to access this conversation');
        }

        // A message is "read" when someone other than the sender has read it
        const result = await Message.updateMany(
            {
                conversationId: conversation._id,
                sender: { $ne: req.user._id },
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );

        res.json({ updated: result.modifiedCount });
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to mark conversation as read');
    }
});

// @desc    Delete (soft-delete) a conversation for the requesting participant.
//          Once every participant has deleted it, it — and its messages —
//          are permanently removed. Any new message reply clears the hide
//          list, so the thread reappears for anyone who had hidden it.
// @route   DELETE /api/conversations/:id
// @access  Private (participant only)
const deleteConversation = asyncHandler(async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            throw httpError(404, 'Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            p => p.toString() === req.user._id.toString()
        );

        // Only a participant of the conversation may delete it
        if (!isParticipant) {
            throw httpError(403, 'Not authorized to delete conversation');
        }

        const alreadyDeletedForMe = (conversation.deletedFor || []).some(
            id => id.toString() === req.user._id.toString()
        );
        if (!alreadyDeletedForMe) {
            conversation.deletedFor.push(req.user._id);
        }

        if (isDeletedForEveryone(conversation)) {
            await Message.deleteMany({ conversationId: conversation._id });
            await conversation.deleteOne();
        } else {
            await conversation.save();
        }

        res.json({ message: 'Conversation removed' });
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to delete conversation');
    }
});

// @desc    Join a conversation as a staff participant (idempotent).
//          The first staff member to join becomes the assignee, which
//          immediately removes the ticket from everyone else's queue.
// @route   POST /api/conversations/:id/join
// @access  Private/Admin or Educator
const joinConversation = asyncHandler(async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            throw httpError(400, 'Invalid conversation ID format');
        }

        // Category check happens BEFORE mutating anything: an educator must
        // not be able to join a billing ticket just by guessing/typing its
        // ID, even though it's already hidden from their queue listing.
        const existing = await Conversation.findById(req.params.id).select('category participants');
        if (!existing) {
            throw httpError(404, 'Conversation not found');
        }
        const alreadyIn = existing.participants.some(p => p.toString() === req.user._id.toString());
        if (!alreadyIn && req.user.role === 'educator' && EDUCATOR_BLOCKED_CATEGORIES.includes(existing.category)) {
            throw httpError(403, 'Educators cannot join billing conversations.');
        }

        // $addToSet is idempotent: if the requester is already a participant nothing changes.
        // assignedTo is only set the first time (filtered update below), so whoever joins
        // first "owns" the ticket even if a second staff member joins later.
        let conversation = await Conversation.findByIdAndUpdate(
            req.params.id,
            { $addToSet: { participants: req.user._id } },
            { new: true }
        );

        if (!conversation) {
            throw httpError(404, 'Conversation not found');
        }

        if (!conversation.assignedTo) {
            conversation = await Conversation.findOneAndUpdate(
                { _id: conversation._id, assignedTo: null },
                { $set: { assignedTo: req.user._id } },
                { new: true }
            ) || conversation;
        }

        await conversation.populate('participants', PUBLIC_USER_FIELDS);
        await conversation.populate('assignedTo', PUBLIC_USER_FIELDS);

        emitToStaff('queue:updated', { conversationId: conversation._id });
        emitToUsers(conversation.participants.map(p => p._id), 'conversation:updated', {
            conversationId: conversation._id
        });

        const enriched = await attachConversationMeta([conversation], req.user._id);
        res.json(enriched[0]);
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to join conversation');
    }
});

// @desc    Get all messages in conversation
// @route   GET /api/conversations/:id/messages
// @access  Private (user must be participant)
const getConversationMessages = asyncHandler(async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            throw httpError(404, 'Conversation not found');
        }

        // Check if user is authorized to view this conversation
        const isParticipant = conversation.participants.some(
            p => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            throw httpError(403, 'Not authorized to access this conversation');
        }

        const deletedForMe = (conversation.deletedFor || []).some(
            id => id.toString() === req.user._id.toString()
        );
        if (deletedForMe) {
            throw httpError(404, 'Conversation not found');
        }

        const messages = await Message.find({ conversationId: req.params.id })
            .populate('sender', PUBLIC_USER_FIELDS)
            .sort({ createdAt: 1 });

        // Normalize sender type for frontend compatibility:
        // frontend expects `senderType` with values 'user' or 'admin'
        const normalized = messages.map(m => {
            const obj = m.toObject ? m.toObject() : m;
            obj.senderType = (obj.senderRole === 'student') ? 'user' : 'admin';
            return obj;
        });

        res.json(normalized);
    } catch (error) {
        if (error.statusCode) throw error;
        res.status(500);
        throw new Error('Failed to fetch messages');
    }
});

// @desc    Send new message
// @route   POST /api/conversations/:id/messages
// @access  Private (user must be participant)
const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            throw httpError(400, 'Message is required');
        }

        if (!req.user) {
            throw httpError(401, 'Not authenticated');
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            throw httpError(400, 'Invalid conversation ID format');
        }

        const conversation = await Conversation.findById(req.params.id);

        if (!conversation) {
            throw httpError(404, 'Conversation not found');
        }

        // Check if user is authorized
        const isParticipant = conversation.participants.some(
            p => p.toString() === req.user._id.toString()
        );
        if (!isParticipant) {
            throw httpError(403, 'Not authorized to send message in this conversation');
        }

        const isStaff = ['admin', 'educator'].includes(req.user.role);

        // Closed tickets are a dead end for staff (they must explicitly
        // reopen via the status endpoint first) but a student reply should
        // just reopen the ticket immediately.
        if (conversation.status === 'closed') {
            if (isStaff) {
                throw httpError(400, 'This conversation is closed. Reopen it before replying.');
            }
            conversation.status = 'pending-admin';
            conversation.resolvedAt = null;
        }

        const deletedForMe = (conversation.deletedFor || []).some(
            id => id.toString() === req.user._id.toString()
        );
        if (deletedForMe) {
            throw httpError(404, 'Conversation not found');
        }

        const role = senderRole(req.user);

        // Create new message
        const newMessage = new Message({
            conversationId: req.params.id,
            sender: req.user._id,
            senderRole: role,
            message
        });

        const createdMessage = await newMessage.save();

        // Update conversation
        conversation.lastMessage = {
            text: message,
            timestamp: new Date(),
            senderId: req.user._id
        };
        conversation.lastMessageAt = new Date();
        conversation.messageCount += 1;
        // A reply brings the thread back for anyone who had hidden it.
        conversation.deletedFor = [];

        // Handle status transitions based on who is sending the message
        if (!isStaff) {
            if (['open', 'pending-user', 'resolved'].includes(conversation.status)) {
                conversation.status = 'pending-admin';
            }
        } else {
            if (['open', 'pending-admin'].includes(conversation.status)) {
                conversation.status = 'pending-user';
            }
        }

        // If conversation was resolved and the user replies, reopen it.
        if (conversation.status === 'resolved' && !isStaff) {
            conversation.status = 'pending-admin';
            conversation.resolvedAt = null;
        }

        await conversation.save();

        // Populate sender for response
        const populatedMessage = await Message.findById(createdMessage._id)
            .populate('sender', PUBLIC_USER_FIELDS);

        // Notify other participants, with a link that actually resolves in
        // their portal (student / educator / admin each have different routes).
        const otherParticipantIds = conversation.participants.filter(
            pid => pid.toString() !== req.user._id.toString()
        );
        if (otherParticipantIds.length > 0) {
            const recipients = await User.find({ _id: { $in: otherParticipantIds } }).select('role');
            for (const recipient of recipients) {
                notify({
                    userId: recipient._id,
                    title: 'New Message',
                    message: `${req.user.username || 'Someone'} sent a message in: ${conversation.subject}`,
                    type: 'new_message',
                    link: notifyLinkFor(recipient.role, conversation._id),
                    entityType: 'message',
                    entityId: createdMessage._id,
                    actorId: req.user._id
                });
            }
        }

        const respMsg = populatedMessage.toObject ? populatedMessage.toObject() : populatedMessage;
        // Add `senderType` to match frontend expectations
        respMsg.senderType = (respMsg.senderRole === 'student') ? 'user' : 'admin';

        emitToUsers(otherParticipantIds, 'message:new', {
            conversationId: conversation._id,
            message: respMsg
        });

        res.status(201).json(respMsg);
    } catch (error) {
        if (error.statusCode) throw error;
        console.error('Error sending message:', error);
        res.status(500);
        throw new Error('Failed to send message: ' + error.message);
    }
});

module.exports = {
    getConversations,
    getMyConversations,
    getSupportQueue,
    getConversation,
    getNewConversationForm,
    createConversation,
    updateConversationStatus,
    deleteConversation,
    joinConversation,
    getConversationMessages,
    sendMessage,
    markConversationAsRead,
    markAllAsRead
};
