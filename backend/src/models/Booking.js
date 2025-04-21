const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'BK' + Math.random().toString(36).substr(2, 9).toUpperCase()
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  bookingType: {
    type: String,
    required: true,
    enum: ['flight', 'hotel', 'bus', 'train']
  },
  bookingDetails: {
    // Common fields
    price: {
      amount: Number,
      currency: String
    },
    passengerCount: Number,
    specialRequests: String,
    
    // Flight specific
    flight: {
      airline: String,
      flightNumber: String,
      departure: {
        airport: String,
        terminal: String,
        time: Date
      },
      arrival: {
        airport: String,
        terminal: String,
        time: Date
      },
      classType: String,
      seatNumbers: [String]
    },
    
    // Hotel specific
    hotel: {
      name: String,
      address: String,
      checkIn: Date,
      checkOut: Date,
      roomType: String,
      roomCount: Number,
      guestNames: [String]
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'completed', 'canceled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    method: String,
    paidAmount: Number,
    paidAt: Date
  },
  cancellation: {
    canceledAt: Date,
    reason: String,
    refundAmount: Number,
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'completed', 'failed']
    }
  },
  notifications: [{
    type: {
      type: String,
      enum: ['confirmation', 'reminder', 'update', 'cancellation']
    },
    sentAt: Date,
    channel: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ bookingId: 1 }, { unique: true });
bookingSchema.index({ status: 1, paymentStatus: 1 });

// Methods to check if booking can be modified/canceled
bookingSchema.methods.canModify = function() {
  const now = new Date();
  const bookingDate = this.bookingType === 'flight' 
    ? this.bookingDetails.flight.departure.time
    : this.bookingDetails.hotel.checkIn;
  
  // Cannot modify if less than 24 hours before departure/check-in
  const hoursDiff = (bookingDate - now) / (1000 * 60 * 60);
  return hoursDiff > 24 && this.status !== 'canceled' && this.status !== 'completed';
};

bookingSchema.methods.canCancel = function() {
  const now = new Date();
  const bookingDate = this.bookingType === 'flight' 
    ? this.bookingDetails.flight.departure.time
    : this.bookingDetails.hotel.checkIn;
  
  // Cannot cancel if less than 48 hours before departure/check-in
  const hoursDiff = (bookingDate - now) / (1000 * 60 * 60);
  return hoursDiff > 48 && this.status !== 'canceled' && this.status !== 'completed';
};

// Calculate refund amount based on cancellation time
bookingSchema.methods.calculateRefundAmount = function() {
  const now = new Date();
  const bookingDate = this.bookingType === 'flight' 
    ? this.bookingDetails.flight.departure.time
    : this.bookingDetails.hotel.checkIn;
  
  const hoursDiff = (bookingDate - now) / (1000 * 60 * 60);
  const originalAmount = this.bookingDetails.price.amount;
  
  // Refund policy:
  // > 72 hours: 100% refund
  // 48-72 hours: 75% refund
  // < 48 hours: no refund
  if (hoursDiff > 72) {
    return originalAmount;
  } else if (hoursDiff > 48) {
    return originalAmount * 0.75;
  }
  return 0;
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
