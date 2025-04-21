const Review = require('../models/Review');
const Booking = require('../models/Booking');
const notificationService = require('./notification.service');

class ReviewService {
  constructor() {}
  async createReview(userId, data) {
    const {
      serviceType,
      serviceId,
      bookingId,
      rating,
      title,
      comment,
      images,
      tags,
      visitDate
    } = data;

    // Verify booking
    const booking = await Booking.findOne({
      _id: bookingId,
      userId,
      'bookingDetails.serviceId': serviceId
    });

    if (!booking) {
      throw new Error('Invalid booking or service');
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      userId,
      serviceType,
      serviceId
    });

    if (existingReview) {
      throw new Error('Review already exists for this service');
    }

    // Create review
    const review = await Review.create({
      userId,
      serviceType,
      serviceId,
      bookingId,
      rating,
      title,
      comment,
      images,
      tags,
      visitDate,
      verifiedBooking: true
    });

    // Get provider ID based on service type
    const providerId = await this.getProviderId(serviceType, serviceId);

    // Notify provider
    if (providerId) {
      await notificationService.send(providerId, {
        title: 'New Review Received',
        message: `A new ${rating.overall}-star review has been submitted for your service`,
        type: 'review_received',
        priority: 'medium',
        reference: {
          type: 'review',
          id: review._id
        },
        metadata: {
          actionUrl: `/reviews/${review._id}`,
          additionalData: {
            serviceType,
            serviceId,
            rating: rating.overall
          }
        }
      });
    }

    return review;
  }

  async getReview(reviewId, userId) {
    const review = await Review.findOne({
      _id: reviewId,
      status: 'approved'
    }).populate('userId', 'name avatar');

    if (!review) {
      throw new Error('Review not found');
    }

    return review;
  }

  async getServiceReviews(serviceType, serviceId, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = 'recent',
      rating,
      withImages
    } = options;

    const query = {
      serviceType,
      serviceId,
      status: 'approved'
    };

    if (rating) {
      query['rating.overall'] = parseInt(rating);
    }

    if (withImages) {
      query['images.0'] = { $exists: true };
    }

    const sortOptions = {
      recent: { createdAt: -1 },
      helpful: { 'metrics.helpful': -1 },
      rating: { 'rating.overall': -1 }
    };

    const reviews = await Review.find(query)
      .sort(sortOptions[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name avatar');

    const total = await Review.countDocuments(query);

    const ratingStats = await Review.getServiceRating(serviceType, serviceId);

    return {
      reviews,
      total,
      rating: ratingStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getUserReviews(userId, options = {}) {
    const { page = 1, limit = 10 } = options;

    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('serviceId');

    const total = await Review.countDocuments({ userId });

    return {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async updateReview(reviewId, userId, data) {
    const review = await Review.findOne({
      _id: reviewId,
      userId
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const allowedUpdates = ['rating', 'title', 'comment', 'images', 'tags'];
    Object.keys(data).forEach(key => {
      if (allowedUpdates.includes(key)) {
        review[key] = data[key];
      }
    });

    review.status = 'pending';
    await review.save();

    return review;
  }

  async deleteReview(reviewId, userId) {
    const review = await Review.findOne({
      _id: reviewId,
      userId
    });

    if (!review) {
      throw new Error('Review not found');
    }

    await review.deleteOne();
    return { success: true };
  }

  async voteReview(reviewId, userId, voteType) {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId.toString() === userId.toString()) {
      throw new Error('Cannot vote on your own review');
    }

    if (voteType === 'helpful') {
      await review.markHelpful(userId);
    } else if (voteType === 'report') {
      await review.report(userId);
    } else {
      throw new Error('Invalid vote type');
    }

    return review;
  }

  async moderateReview(reviewId, moderatorId, action, reason = '') {
    const review = await Review.findById(reviewId);
    
    if (!review) {
      throw new Error('Review not found');
    }

    if (action === 'approve') {
      await review.approve(moderatorId);
    } else if (action === 'reject') {
      await review.reject(moderatorId, reason);
    } else {
      throw new Error('Invalid moderation action');
    }

    // Notify user about moderation
    await notificationService.send(review.userId, {
      title: `Review ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      message: action === 'approve' 
        ? 'Your review has been approved and is now visible'
        : `Your review has been rejected. Reason: ${reason}`,
      type: 'review_moderation',
      priority: 'medium',
      reference: {
        type: 'review',
        id: review._id
      }
    });

    return review;
  }

  async getProviderId(serviceType, serviceId) {
    let providerId;
    const booking = await Booking.findOne({
      serviceType,
      serviceId,
      status: 'completed'
    });

    if (booking) {
      switch (serviceType) {
        case 'hotel':
          providerId = booking.bookingDetails.hotelProviderId;
          break;
        case 'ride':
          providerId = booking.bookingDetails.driverId;
          break;
        case 'package':
          providerId = booking.bookingDetails.tourProviderId;
          break;
        default:
          // For services without direct providers (like flights)
          providerId = null;
      }
    }
    return providerId;
  }

  async getReviewAnalytics(serviceType, serviceId, period = 30) {
    const date = new Date();
    date.setDate(date.getDate() - period);

    const analytics = await Review.aggregate([
      {
        $match: {
          serviceType,
          serviceId,
          status: 'approved',
          createdAt: { $gte: date }
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating.overall' },
          totalReviews: { $sum: 1 },
          aspectRatings: {
            $push: '$rating.aspects'
          }
        }
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: ['$averageRating', 1] },
          totalReviews: 1,
          aspectAverages: {
            cleanliness: { $avg: '$aspectRatings.cleanliness' },
            comfort: { $avg: '$aspectRatings.comfort' },
            location: { $avg: '$aspectRatings.location' },
            service: { $avg: '$aspectRatings.service' },
            value: { $avg: '$aspectRatings.value' }
          }
        }
      }
    ]);

    return analytics[0] || {
      averageRating: 0,
      totalReviews: 0,
      aspectAverages: {
        cleanliness: 0,
        comfort: 0,
        location: 0,
        service: 0,
        value: 0
      }
    };
  }
}

module.exports = new ReviewService();
