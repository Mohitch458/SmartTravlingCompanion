const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const rideController = require('../controllers/rideController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation schemas
const locationSchema = {
  coordinates: {
    isArray: true,
    custom: {
      options: (value) => {
        return value.length === 2 &&
          typeof value[0] === 'number' &&
          typeof value[1] === 'number' &&
          value[0] >= -180 && value[0] <= 180 &&
          value[1] >= -90 && value[1] <= 90;
      },
      errorMessage: 'Invalid coordinates format'
    }
  },
  address: {
    isString: true,
    notEmpty: true,
    errorMessage: 'Address is required'
  }
};

const requestRideSchema = [
  body('pickupLocation')
    .isObject()
    .withMessage('Pickup location is required')
    .custom((value) => {
      if (!value.coordinates || !value.address) {
        throw new Error('Invalid pickup location format');
      }
      return true;
    }),
  body('pickupLocation.coordinates').custom(locationSchema.coordinates.custom),
  body('pickupLocation.address').custom(locationSchema.address),
  
  body('dropoffLocation')
    .isObject()
    .withMessage('Dropoff location is required')
    .custom((value) => {
      if (!value.coordinates || !value.address) {
        throw new Error('Invalid dropoff location format');
      }
      return true;
    }),
  body('dropoffLocation.coordinates').custom(locationSchema.coordinates.custom),
  body('dropoffLocation.address').custom(locationSchema.address),
  
  body('rideType')
    .isIn(['sedan', 'suv', 'luxury', 'bike'])
    .withMessage('Invalid ride type')
];

const updateLocationSchema = [
  body('coordinates')
    .isArray()
    .custom(locationSchema.coordinates.custom)
];

const rateRideSchema = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('feedback')
    .optional()
    .isString()
    .isLength({ min: 0, max: 500 })
    .withMessage('Feedback must not exceed 500 characters')
];

// Routes
router.post('/request',
  auth,
  requestRideSchema,
  validate,
  rideController.requestRide
);

router.get('/active',
  auth,
  rideController.getActiveRide
);

router.get('/history',
  auth,
  rideController.getRideHistory
);

router.get('/:rideId',
  auth,
  rideController.getRideStatus
);

router.patch('/:rideId/status',
  auth,
  body('status')
    .isIn(['accepted', 'arrived', 'inProgress', 'completed', 'canceled'])
    .withMessage('Invalid status'),
  validate,
  rideController.updateRideStatus
);

router.patch('/:rideId/location',
  auth,
  updateLocationSchema,
  validate,
  rideController.updateLocation
);

router.post('/:rideId/cancel',
  auth,
  body('reason')
    .isString()
    .notEmpty()
    .withMessage('Cancellation reason is required'),
  validate,
  rideController.cancelRide
);

router.post('/:rideId/complete',
  auth,
  rideController.completeRide
);

router.post('/:rideId/rate',
  auth,
  rateRideSchema,
  validate,
  rideController.rateRide
);

module.exports = router;
