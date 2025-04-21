const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const validate = require('../middleware/validate');

// Validation schemas
const createReviewSchema = [
  body('serviceType')
    .isIn(['hotel', 'flight', 'ride', 'driver', 'destination', 'package'])
    .withMessage('Invalid service type'),
  body('serviceId')
    .isMongoId()
    .withMessage('Invalid service ID'),
  body('bookingId')
    .isMongoId()
    .withMessage('Invalid booking ID'),
  body('rating.overall')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  body('rating.aspects.*')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Aspect ratings must be between 1 and 5'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters'),
  body('comment')
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
  body('images.*.caption')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Image caption must not exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Tag must not exceed 20 characters'),
  body('visitDate')
    .isISO8601()
    .withMessage('Invalid visit date')
];

const updateReviewSchema = [
  body('rating.overall')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  body('rating.aspects.*')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Aspect ratings must be between 1 and 5'),
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters'),
  body('comment')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
  body('images.*.caption')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Image caption must not exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Tag must not exceed 20 characters')
];

const moderationSchema = [
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Invalid moderation action'),
  body('reason')
    .if(body('action').equals('reject'))
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Reason is required for rejection')
];

const responseSchema = [
  body('content')
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Response must be between 10 and 500 characters')
];

const voteSchema = [
  body('voteType')
    .isIn(['helpful', 'report'])
    .withMessage('Invalid vote type')
];

// Routes
router.post('/',
  auth,
  createReviewSchema,
  validate,
  reviewController.createReview
);

router.get('/user',
  auth,
  reviewController.getUserReviews
);

router.get('/:reviewId',
  reviewController.getReview
);

router.get('/service/:serviceType/:serviceId',
  reviewController.getServiceReviews
);

router.patch('/:reviewId',
  auth,
  updateReviewSchema,
  validate,
  reviewController.updateReview
);

router.delete('/:reviewId',
  auth,
  reviewController.deleteReview
);

router.post('/:reviewId/moderate',
  auth,
  checkRole(['admin', 'moderator']),
  moderationSchema,
  validate,
  reviewController.moderateReview
);

router.post('/:reviewId/respond',
  auth,
  checkRole(['admin', 'provider']),
  responseSchema,
  validate,
  reviewController.respondToReview
);

router.post('/:reviewId/vote',
  auth,
  voteSchema,
  validate,
  reviewController.voteReview
);

router.get('/analytics/:serviceType/:serviceId',
  auth,
  checkRole(['admin', 'provider']),
  reviewController.getReviewAnalytics
);

module.exports = router;
