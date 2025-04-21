const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation schemas
const createBookingSchema = [
  body('bookingType')
    .isIn(['flight', 'hotel', 'bus', 'train'])
    .withMessage('Invalid booking type'),
  body('bookingDetails')
    .isObject()
    .withMessage('Booking details are required'),
  body('bookingDetails.price.amount')
    .isNumeric()
    .withMessage('Price amount must be a number'),
  body('bookingDetails.price.currency')
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Invalid currency code'),
  body('bookingDetails.passengerCount')
    .isInt({ min: 1, max: 9 })
    .withMessage('Invalid passenger count')
];

const updateBookingSchema = [
  body('bookingDetails.specialRequests')
    .optional()
    .isString()
    .withMessage('Special requests must be a string')
];

const cancelBookingSchema = [
  body('reason')
    .isString()
    .withMessage('Cancellation reason is required')
];

const updatePaymentSchema = [
  body('paymentStatus')
    .isIn(['pending', 'paid', 'failed', 'refunded'])
    .withMessage('Invalid payment status'),
  body('transactionId')
    .isString()
    .withMessage('Transaction ID is required')
];

// Routes
router.post('/',
  auth,
  createBookingSchema,
  validate,
  bookingController.createBooking
);

router.get('/',
  auth,
  bookingController.getBookings
);

router.get('/:bookingId',
  auth,
  bookingController.getBooking
);

router.patch('/:bookingId',
  auth,
  updateBookingSchema,
  validate,
  bookingController.updateBooking
);

router.post('/:bookingId/cancel',
  auth,
  cancelBookingSchema,
  validate,
  bookingController.cancelBooking
);

router.patch('/:bookingId/payment',
  auth,
  updatePaymentSchema,
  validate,
  bookingController.updatePaymentStatus
);

module.exports = router;
