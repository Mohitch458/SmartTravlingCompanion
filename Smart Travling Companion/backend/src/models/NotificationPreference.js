const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  channels: {
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      tokens: [{
        token: String,
        device: String,
        platform: {
          type: String,
          enum: ['android', 'ios', 'web']
        },
        lastUsed: Date
      }]
    },
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['instant', 'daily', 'weekly', 'never'],
        default: 'instant'
      }
    }
  },
  preferences: {
    booking_confirmation: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    booking_reminder: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    booking_update: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    payment_success: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    payment_failed: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    refund_initiated: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    refund_completed: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    ride_update: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false }
      }
    },
    driver_assigned: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: false }
      }
    },
    promotional_offer: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: true }
      }
    },
    account_update: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    },
    system_alert: {
      enabled: {
        type: Boolean,
        default: true
      },
      channels: {
        inApp: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        email: { type: Boolean, default: true }
      }
    }
  },
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00'
    },
    end: {
      type: String,
      default: '08:00'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  }
}, {
  timestamps: true
});

// Methods
notificationPreferenceSchema.methods.isChannelEnabled = function(channel) {
  return this.channels[channel]?.enabled || false;
};

notificationPreferenceSchema.methods.isTypeEnabled = function(type, channel) {
  const pref = this.preferences[type];
  return pref?.enabled && pref?.channels[channel];
};

notificationPreferenceSchema.methods.addPushToken = async function(token, device, platform) {
  const existingToken = this.channels.push.tokens.find(t => t.token === token);
  
  if (existingToken) {
    existingToken.lastUsed = new Date();
    existingToken.device = device;
    existingToken.platform = platform;
  } else {
    this.channels.push.tokens.push({
      token,
      device,
      platform,
      lastUsed: new Date()
    });
  }
  
  return this.save();
};

notificationPreferenceSchema.methods.removePushToken = async function(token) {
  this.channels.push.tokens = this.channels.push.tokens.filter(t => t.token !== token);
  return this.save();
};

notificationPreferenceSchema.methods.isInQuietHours = function() {
  if (!this.quietHours.enabled) return false;

  const now = new Date();
  const tz = this.quietHours.timezone;
  const currentTime = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: false });
  
  const start = this.quietHours.start;
  const end = this.quietHours.end;
  
  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  } else {
    return currentTime >= start || currentTime <= end;
  }
};

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

module.exports = NotificationPreference;
