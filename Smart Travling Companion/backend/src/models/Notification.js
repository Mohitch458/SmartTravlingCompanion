const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'booking_confirmation',
      'booking_reminder',
      'booking_update',
      'payment_success',
      'payment_failed',
      'refund_initiated',
      'refund_completed',
      'ride_update',
      'driver_assigned',
      'promotional_offer',
      'account_update',
      'system_alert'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  readStatus: {
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date
  },
  deliveryStatus: {
    inApp: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date
    },
    push: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      deviceToken: String
    },
    email: {
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      emailId: String
    }
  },
  reference: {
    type: {
      type: String,
      enum: ['booking', 'payment', 'ride', 'promotion', 'account']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reference.type'
    }
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  metadata: {
    actionUrl: String,
    imageUrl: String,
    additionalData: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, 'readStatus.isRead': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Methods
notificationSchema.methods.markAsRead = async function() {
  if (!this.readStatus.isRead) {
    this.readStatus = {
      isRead: true,
      readAt: new Date()
    };
    await this.save();
  }
  return this;
};

notificationSchema.methods.markAsDelivered = async function(channel, details = {}) {
  if (channel in this.deliveryStatus) {
    this.deliveryStatus[channel] = {
      delivered: true,
      deliveredAt: new Date(),
      ...details
    };
    await this.save();
  }
  return this;
};

// Statics
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    'readStatus.isRead': false
  });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      userId,
      'readStatus.isRead': false
    },
    {
      $set: {
        'readStatus.isRead': true,
        'readStatus.readAt': new Date()
      }
    }
  );
};

notificationSchema.statics.deleteOldNotifications = function(userId, days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.deleteMany({
    userId,
    createdAt: { $lt: date }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
