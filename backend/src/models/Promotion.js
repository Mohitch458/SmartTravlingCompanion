const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscount: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  applicableFor: [{
    type: String,
    enum: ['ride', 'hotel', 'flight', 'bus', 'train']
  }],
  usageLimit: {
    perUser: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    }
  },
  usageCount: {
    type: Number,
    default: 0
  },
  userUsage: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    count: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  }],
  description: String,
  terms: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    campaign: String,
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes
promotionSchema.index({ code: 1 }, { unique: true });
promotionSchema.index({ validUntil: 1 });
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ 'userUsage.userId': 1 });

// Methods
promotionSchema.methods.isValid = function() {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    this.usageCount < this.usageLimit.total
  );
};

promotionSchema.methods.canUserUse = async function(userId) {
  if (!this.isValid()) {
    throw new Error('Promotion is not valid');
  }

  const userUsage = this.userUsage.find(u => u.userId.toString() === userId.toString());
  if (!userUsage) {
    return true;
  }

  if (userUsage.count >= this.usageLimit.perUser) {
    throw new Error('User has exceeded usage limit for this promotion');
  }

  return true;
};

promotionSchema.methods.calculateDiscount = function(orderValue) {
  if (orderValue < this.minOrderValue) {
    throw new Error(`Minimum order value is ${this.minOrderValue}`);
  }

  let discount;
  if (this.type === 'percentage') {
    discount = (orderValue * this.value) / 100;
  } else {
    discount = this.value;
  }

  // Apply maximum discount limit
  return Math.min(discount, this.maxDiscount);
};

promotionSchema.methods.use = async function(userId) {
  if (!this.isValid()) {
    throw new Error('Promotion is not valid');
  }

  const userUsageIndex = this.userUsage.findIndex(u => u.userId.toString() === userId.toString());
  
  if (userUsageIndex === -1) {
    this.userUsage.push({
      userId,
      count: 1,
      lastUsed: new Date()
    });
  } else {
    if (this.userUsage[userUsageIndex].count >= this.usageLimit.perUser) {
      throw new Error('User has exceeded usage limit for this promotion');
    }
    this.userUsage[userUsageIndex].count += 1;
    this.userUsage[userUsageIndex].lastUsed = new Date();
  }

  this.usageCount += 1;
  return this.save();
};

// Statics
promotionSchema.statics.findValidPromotions = function(type, userId) {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    applicableFor: type,
    usageCount: { $lt: '$usageLimit.total' },
    'userUsage.userId': {
      $not: {
        $elemMatch: {
          userId,
          count: { $gte: '$usageLimit.perUser' }
        }
      }
    }
  });
};

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
