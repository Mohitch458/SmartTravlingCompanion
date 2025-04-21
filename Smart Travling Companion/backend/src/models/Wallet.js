const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  paymentMethods: [{
    type: {
      type: String,
      enum: ['card', 'upi', 'netbanking'],
      required: true
    },
    details: {
      // Card details
      cardNumber: String, // Last 4 digits only
      cardType: String,
      expiryMonth: String,
      expiryYear: String,
      tokenId: String, // Payment gateway token
      
      // UPI details
      upiId: String,
      
      // Netbanking details
      bankName: String,
      accountLastFour: String
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  limits: {
    dailyTransactionLimit: {
      type: Number,
      default: 50000
    },
    monthlyTransactionLimit: {
      type: Number,
      default: 200000
    },
    minTransactionAmount: {
      type: Number,
      default: 10
    },
    maxTransactionAmount: {
      type: Number,
      default: 50000
    }
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes
walletSchema.index({ userId: 1 }, { unique: true });
walletSchema.index({ 'paymentMethods.tokenId': 1 });

// Methods to manage wallet balance
walletSchema.methods.credit = async function(amount) {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }
  this.balance.amount += amount;
  return this.save();
};

walletSchema.methods.debit = async function(amount) {
  if (amount <= 0) {
    throw new Error('Debit amount must be positive');
  }
  if (this.balance.amount < amount) {
    throw new Error('Insufficient balance');
  }
  this.balance.amount -= amount;
  return this.save();
};

// Method to add payment method
walletSchema.methods.addPaymentMethod = async function(paymentMethod) {
  // If this is the first payment method, make it default
  if (this.paymentMethods.length === 0) {
    paymentMethod.isDefault = true;
  }
  this.paymentMethods.push(paymentMethod);
  return this.save();
};

// Method to remove payment method
walletSchema.methods.removePaymentMethod = async function(paymentMethodId) {
  const index = this.paymentMethods.findIndex(pm => pm._id.toString() === paymentMethodId);
  if (index === -1) {
    throw new Error('Payment method not found');
  }
  
  // If removing default payment method, make another one default
  if (this.paymentMethods[index].isDefault && this.paymentMethods.length > 1) {
    const newDefault = this.paymentMethods.find(pm => pm._id.toString() !== paymentMethodId);
    if (newDefault) {
      newDefault.isDefault = true;
    }
  }
  
  this.paymentMethods.splice(index, 1);
  return this.save();
};

// Method to set default payment method
walletSchema.methods.setDefaultPaymentMethod = async function(paymentMethodId) {
  const methods = this.paymentMethods;
  const currentDefault = methods.find(pm => pm.isDefault);
  const newDefault = methods.find(pm => pm._id.toString() === paymentMethodId);
  
  if (!newDefault) {
    throw new Error('Payment method not found');
  }
  
  if (currentDefault) {
    currentDefault.isDefault = false;
  }
  newDefault.isDefault = true;
  
  return this.save();
};

// Method to check transaction limits
walletSchema.methods.checkTransactionLimits = async function(amount) {
  if (amount < this.limits.minTransactionAmount) {
    throw new Error(`Minimum transaction amount is ${this.limits.minTransactionAmount}`);
  }
  if (amount > this.limits.maxTransactionAmount) {
    throw new Error(`Maximum transaction amount is ${this.limits.maxTransactionAmount}`);
  }
  
  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyTotal = await Transaction.aggregate([
    {
      $match: {
        userId: this.userId,
        createdAt: { $gte: today },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  if (dailyTotal.length > 0 && dailyTotal[0].total + amount > this.limits.dailyTransactionLimit) {
    throw new Error('Daily transaction limit exceeded');
  }
  
  // Check monthly limit
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthlyTotal = await Transaction.aggregate([
    {
      $match: {
        userId: this.userId,
        createdAt: { $gte: firstDayOfMonth },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  
  if (monthlyTotal.length > 0 && monthlyTotal[0].total + amount > this.limits.monthlyTransactionLimit) {
    throw new Error('Monthly transaction limit exceeded');
  }
  
  return true;
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
