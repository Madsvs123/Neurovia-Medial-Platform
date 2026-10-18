const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  provider: {
    type: String,
    required: true,
    trim: true
  },
  transactionId: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  receiptUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes (transactionId is already indexed via unique: true)
paymentSchema.index({ userId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;