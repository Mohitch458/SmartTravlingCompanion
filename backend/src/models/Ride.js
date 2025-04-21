const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  rideId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'RD' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  dropoffLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['requested', 'searching', 'accepted', 'arrived', 'inProgress', 'completed', 'canceled'],
    default: 'requested'
  },
  rideType: {
    type: String,
    enum: ['sedan', 'suv', 'luxury', 'bike'],
    required: true
  },
  fare: {
    base: Number,
    distance: Number,
    time: Number,
    surge: Number,
    tax: Number,
    total: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    required: true
  },
  timing: {
    requested: {
      type: Date,
      default: Date.now
    },
    accepted: Date,
    arrived: Date,
    started: Date,
    completed: Date,
    canceled: Date
  },
  distance: {
    estimated: Number,
    actual: Number,
    unit: {
      type: String,
      default: 'km'
    }
  },
  duration: {
    estimated: Number,
    actual: Number,
    unit: {
      type: String,
      default: 'minutes'
    }
  },
  route: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: [[Number]]
  },
  rating: {
    driver: {
      rating: Number,
      feedback: String
    },
    rider: {
      rating: Number,
      feedback: String
    }
  },
  cancellation: {
    reason: String,
    by: {
      type: String,
      enum: ['rider', 'driver', 'system']
    },
    at: Date
  }
}, {
  timestamps: true
});

// Indexes
rideSchema.index({ userId: 1, createdAt: -1 });
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ status: 1 });
rideSchema.index({ pickupLocation: '2dsphere' });
rideSchema.index({ dropoffLocation: '2dsphere' });

// Calculate fare
rideSchema.methods.calculateFare = function(distance, duration, surgeMultiplier = 1) {
  const BASE_FARE = 50;
  const PER_KM_RATE = 12;
  const PER_MINUTE_RATE = 2;
  const TAX_RATE = 0.05;

  const distanceFare = distance * PER_KM_RATE;
  const timeFare = duration * PER_MINUTE_RATE;
  const baseFare = BASE_FARE;
  const surgeFare = (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1);
  const subtotal = baseFare + distanceFare + timeFare + surgeFare;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  this.fare = {
    base: baseFare,
    distance: distanceFare,
    time: timeFare,
    surge: surgeFare,
    tax: tax,
    total: Math.round(total),
    currency: 'INR'
  };

  return this.fare;
};

// Update ride status with timing
rideSchema.methods.updateStatus = async function(status) {
  this.status = status;
  this.timing[status] = new Date();
  return this.save();
};

// Add route point
rideSchema.methods.addRoutePoint = async function(coordinates) {
  if (!this.route.coordinates) {
    this.route.coordinates = [];
  }
  this.route.coordinates.push(coordinates);
  return this.save();
};

// Calculate actual distance and duration
rideSchema.methods.completeRide = async function() {
  // Calculate actual distance from route points
  if (this.route.coordinates && this.route.coordinates.length > 1) {
    let totalDistance = 0;
    for (let i = 1; i < this.route.coordinates.length; i++) {
      const point1 = this.route.coordinates[i - 1];
      const point2 = this.route.coordinates[i];
      totalDistance += calculateDistance(point1, point2);
    }
    this.distance.actual = totalDistance;
  }

  // Calculate actual duration
  if (this.timing.started && this.timing.completed) {
    const duration = (this.timing.completed - this.timing.started) / (1000 * 60); // in minutes
    this.duration.actual = Math.round(duration);
  }

  return this.save();
};

// Helper function to calculate distance between two points
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2[1] - point1[1]);
  const dLon = toRad(point2[0] - point1[0]);
  const lat1 = toRad(point1[1]);
  const lat2 = toRad(point2[1]);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}

const Ride = mongoose.model('Ride', rideSchema);

module.exports = Ride;
