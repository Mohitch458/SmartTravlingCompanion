const { validationResult } = require('express-validator');
const reviewService = require('../services/review.service');

exports.createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await reviewService.createReview(req.user.id, req.body);
    
    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getReview = async (req, res) => {
  try {
    const review = await reviewService.getReview(req.params.reviewId, req.user.id);
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};

exports.getServiceReviews = async (req, res) => {
  try {
    const { serviceType, serviceId } = req.params;
    const result = await reviewService.getServiceReviews(serviceType, serviceId, req.query);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const result = await reviewService.getUserReviews(req.user.id, req.query);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await reviewService.updateReview(
      req.params.reviewId,
      req.user.id,
      req.body
    );
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    await reviewService.deleteReview(req.params.reviewId, req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.moderateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { action, reason } = req.body;
    const review = await reviewService.moderateReview(
      req.params.reviewId,
      req.user.id,
      action,
      reason
    );
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.respondToReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await reviewService.respondToReview(
      req.params.reviewId,
      req.user.id,
      req.body.content
    );
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.voteReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const review = await reviewService.voteReview(
      req.params.reviewId,
      req.user.id,
      req.body.voteType
    );
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

exports.getReviewAnalytics = async (req, res) => {
  try {
    const { serviceType, serviceId } = req.params;
    const { period } = req.query;
    
    const analytics = await reviewService.getReviewAnalytics(
      serviceType,
      serviceId,
      period
    );
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
