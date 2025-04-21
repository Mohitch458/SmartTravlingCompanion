const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceType: {
    type: String,
    enum: ['hotel', 'flight', 'ride', 'driver', 'destination', 'package'],
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'serviceType',
    required: true,
    index: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    aspects: {
      cleanliness: {
        type: Number,
        min: 1,
        max: 5
      },
      comfort: {
        type: Number,
        min: 1,
        max: 5
      },
      location: {
        type: Number,
        min: 1,
        max: 5
      },
      service: {
        type: Number,
        min: 1,
        max: 5
      },
      value: {
        type: Number,
        min: 1,
        max: 5
      }
    }
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  images: [{
    url: String,
    caption: String
  }],
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'reported'],
    default: 'pending'
  },
  moderation: {
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    reason: String
  },
  response: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  },
  metrics: {
    helpful: {
      type: Number,
      default: 0
    },
    reported: {
      type: Number,
      default: 0
    }
  },
  userVotes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    voteType: {
      type: String,
      enum: ['helpful', 'report']
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  verifiedBooking: {
    type: Boolean,
    default: true
  },
  visitDate: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ userId: 1, serviceType: 1, serviceId: 1 }, { unique: true });
reviewSchema.index({ serviceType: 1, serviceId: 1, createdAt: -1 });
reviewSchema.index({ status: 1 });

// Virtual field for average aspect ratings
reviewSchema.virtual('averageAspectRating').get(function() {
  const aspects = this.rating.aspects;
  const validRatings = Object.values(aspects).filter(r => r !== undefined);
  if (validRatings.length === 0) return null;
  return validRatings.reduce((a, b) => a + b) / validRatings.length;
});

// Methods
reviewSchema.methods.approve = async function(moderatorId) {
  this.status = 'approved';
  this.moderation = {
    moderatedBy: moderatorId,
    moderatedAt: new Date()
  };
  return this.save();
};

reviewSchema.methods.reject = async function(moderatorId, reason) {
  this.status = 'rejected';
  this.moderation = {
    moderatedBy: moderatorId,
    moderatedAt: new Date(),
    reason
  };
  return this.save();
};

reviewSchema.methods.addResponse = async function(content, responderId) {
  this.response = {
    content,
    respondedBy: responderId,
    respondedAt: new Date()
  };
  return this.save();
};

reviewSchema.methods.vote = async function(userId, voteType) {
  const existingVote = this.userVotes.find(
    vote => vote.userId.toString() === userId.toString()
  );

  if (existingVote) {
    if (existingVote.voteType === voteType) {
      // Remove vote if same type
      this.userVotes = this.userVotes.filter(
        vote => vote.userId.toString() !== userId.toString()
      );
      this.metrics[voteType]--;
    } else {
      // Change vote type
      existingVote.voteType = voteType;
      existingVote.votedAt = new Date();
      this.metrics[existingVote.voteType]--;
      this.metrics[voteType]++;
    }
  } else {
    // Add new vote
    this.userVotes.push({
      userId,
      voteType,
      votedAt: new Date()
    });
    this.metrics[voteType]++;
  }

  return this.save();
};

// Statics
reviewSchema.statics.getServiceRating = async function(serviceType, serviceId) {
  const aggregation = await this.aggregate([
    {
      $match: {
        serviceType,
        serviceId,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating.overall' },
        totalReviews: { $sum: 1 },
        ratings: {
          $push: '$rating.overall'
        }
      }
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 1] },
        totalReviews: 1,
        distribution: {
          5: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 5] }
              }
            }
          },
          4: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 4] }
              }
            }
          },
          3: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 3] }
              }
            }
          },
          2: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 2] }
              }
            }
          },
          1: {
            $size: {
              $filter: {
                input: '$ratings',
                cond: { $eq: ['$$this', 1] }
              }
            }
          }
        }
      }
    }
  ]);

  return aggregation[0] || {
    averageRating: 0,
    totalReviews: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
