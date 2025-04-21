const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'DRV' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleDetails: {
    type: {
      type: String,
      enum: ['sedan', 'suv', 'luxury', 'bike'],
      required: true
    },
    model: {
      type: String,
      required: true
    },
    number: {
      type: String,
      required: true
    },
    color: String
  },
  documents: {
    license: {
      number: String,
      expiryDate: Date,
      verified: Boolean
    },
    insurance: {
      number: String,
      expiryDate: Date,
      verified: Boolean
    },
    vehicleRegistration: {
      number: String,
      expiryDate: Date,
      verified: Boolean
    }
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  status: {
    type: String,
    enum: ['offline', 'available', 'engaged'],
    default: 'offline'
  },
  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  ratings: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  statistics: {
    totalRides: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalDistance: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 100
    }
  },
  availability: {
    isActive: {
      type: Boolean,
      default: false
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String
    }]
  }
}, {
  timestamps: true
});

// Index for geospatial queries
driverSchema.index({ currentLocation: '2dsphere' });

// Method to find nearby drivers
driverSchema.statics.findNearbyDrivers = async function(coordinates, maxDistance = 5000) {
  return this.find({
    status: 'available',
    'availability.isActive': true,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Method to update driver location
driverSchema.methods.updateLocation = async function(coordinates) {
  this.currentLocation.coordinates = coordinates;
  return this.save();
};

// Method to update driver status
driverSchema.methods.updateStatus = async function(status) {
  this.status = status;
  return this.save();
};

// Method to update driver statistics after ride completion
driverSchema.methods.updateStatistics = async function(fare, distance) {
  this.statistics.totalRides += 1;
  this.statistics.totalEarnings += fare;
  this.statistics.totalDistance += distance;
  return this.save();
};

// Method to update driver rating
driverSchema.methods.updateRating = async function(rating) {
  const oldTotal = this.ratings.average * this.ratings.count;
  this.ratings.count += 1;
  this.ratings.average = (oldTotal + rating) / this.ratings.count;
  return this.save();
};

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
