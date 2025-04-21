const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  category: {
    type: String,
    enum: ['wallet_load', 'ride_payment', 'refund', 'booking_payment', 'withdrawal', 'promotion'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['wallet', 'card', 'upi', 'netbanking'],
      required: true
    },
    details: {
      cardLastFour: String,
      upiId: String,
      bankName: String,
      tokenId: String
    }
  },
  reference: {
    type: {
      type: String,
      enum: ['ride', 'booking', 'wallet', 'promotion']
    },
    id: String
  },
  metadata: {
    description: String,
    notes: String,
    location: String,
    deviceInfo: {
      ip: String,
      userAgent: String,
      device: String
    }
  },
  gateway: {
    name: {
      type: String,
      enum: ['stripe', 'razorpay']
    },
    transactionId: String,
    response: Object
  },
  refund: {
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    processedAt: Date
  },
  promotion: {
    code: String,
    discount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    }
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 }, { unique: true });
transactionSchema.index({ status: 1 });
transactionSchema.index({ 'reference.id': 1 });

// Statics
transactionSchema.statics.createTransaction = async function(data) {
  const transaction = new this(data);
  await transaction.save();

  // Update wallet balance
  const wallet = await mongoose.model('Wallet').findOne({ userId: data.userId });
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (data.type === 'credit') {
    await wallet.credit(data.amount);
  } else {
    await wallet.debit(data.amount);
  }

  return transaction;
};

// Methods
transactionSchema.methods.updateStatus = async function(status, gatewayResponse = null) {
  this.status = status;
  if (gatewayResponse) {
    this.gateway.response = gatewayResponse;
  }
  return this.save();
};

transactionSchema.methods.processRefund = async function(amount, reason) {
  if (this.status !== 'completed') {
    throw new Error('Only completed transactions can be refunded');
  }

  if (amount > this.amount) {
    throw new Error('Refund amount cannot be greater than transaction amount');
  }

  this.refund = {
    amount,
    reason,
    status: 'pending',
    processedAt: new Date()
  };

  // Create refund transaction
  await mongoose.model('Transaction').createTransaction({
    userId: this.userId,
    amount,
    type: 'credit',
    category: 'refund',
    paymentMethod: {
      type: 'wallet'
    },
    reference: {
      type: this.reference.type,
      id: this.reference.id
    },
    metadata: {
      description: `Refund for transaction ${this.transactionId}`,
      notes: reason
    }
  });

  this.status = 'refunded';
  return this.save();
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
