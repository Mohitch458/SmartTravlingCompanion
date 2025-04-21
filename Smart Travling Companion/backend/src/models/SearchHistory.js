const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  searchId: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substr(2, 9)
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  searchType: {
    type: String,
    required: true,
    enum: ['flight', 'hotel', 'bus', 'train']
  },
  origin: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  departureDate: {
    type: Date,
    required: true
  },
  returnDate: Date,
  passengerCount: {
    type: Number,
    required: true,
    min: 1
  },
  classType: {
    type: String,
    required: true,
    enum: ['economy', 'business', 'first', 'all']
  },
  filters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  results: [{
    type: mongoose.Schema.Types.Mixed
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster searches
searchHistorySchema.index({ userId: 1, createdAt: -1 });
searchHistorySchema.index({ searchType: 1, departureDate: 1 });

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

module.exports = SearchHistory;
