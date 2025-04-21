const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation schemas
const addFundsSchema = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 10 })
    .withMessage('Minimum amount is 10'),
  body('paymentMethod')
    .isObject()
    .withMessage('Payment method is required'),
  body('paymentMethod.type')
    .isIn(['card', 'upi', 'netbanking'])
    .withMessage('Invalid payment method type')
];

const processPaymentSchema = [
  body('transactionId')
    .isString()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('paymentResponse')
    .isObject()
    .notEmpty()
    .withMessage('Payment response is required')
];

const makePaymentSchema = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 1 })
    .withMessage('Amount must be positive'),
  body('purpose')
    .isIn(['ride_payment', 'booking_payment'])
    .withMessage('Invalid payment purpose'),
  body('paymentMethod')
    .isObject()
    .withMessage('Payment method is required'),
  body('reference')
    .isObject()
    .withMessage('Reference is required')
];

const promotionSchema = [
  body('code')
    .isString()
    .notEmpty()
    .withMessage('Promotion code is required'),
  body('orderValue')
    .isNumeric()
    .withMessage('Order value must be a number')
    .isFloat({ min: 1 })
    .withMessage('Order value must be positive'),
  body('type')
    .isIn(['ride', 'hotel', 'flight', 'bus', 'train'])
    .withMessage('Invalid promotion type')
];

const refundSchema = [
  body('transactionId')
    .isString()
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 1 })
    .withMessage('Amount must be positive'),
  body('reason')
    .isString()
    .notEmpty()
    .withMessage('Reason is required')
];

const addPaymentMethodSchema = [
  body('type')
    .isIn(['card', 'upi', 'netbanking'])
    .withMessage('Invalid payment method type'),
  body('details')
    .isObject()
    .withMessage('Payment details are required')
];

// Wallet routes
router.get('/wallet',
  auth,
  paymentController.getWallet
);

router.post('/wallet/add-funds',
  auth,
  addFundsSchema,
  validate,
  paymentController.addFunds
);

// Payment routes
router.post('/process',
  auth,
  processPaymentSchema,
  validate,
  paymentController.processPayment
);

router.post('/pay',
  auth,
  makePaymentSchema,
  validate,
  paymentController.makePayment
);

// Promotion routes
router.post('/promotion/apply',
  auth,
  promotionSchema,
  validate,
  paymentController.applyPromotion
);

// Refund routes
router.post('/refund',
  auth,
  refundSchema,
  validate,
  paymentController.requestRefund
);

// Transaction history
router.get('/transactions',
  auth,
  paymentController.getTransactionHistory
);

// Payment methods
router.get('/methods',
  auth,
  paymentController.getPaymentMethods
);

router.post('/methods',
  auth,
  addPaymentMethodSchema,
  validate,
  paymentController.addPaymentMethod
);

router.delete('/methods/:paymentMethodId',
  auth,
  param('paymentMethodId')
    .isMongoId()
    .withMessage('Invalid payment method ID'),
  validate,
  paymentController.removePaymentMethod
);

router.put('/methods/:paymentMethodId/default',
  auth,
  param('paymentMethodId')
    .isMongoId()
    .withMessage('Invalid payment method ID'),
  validate,
  paymentController.setDefaultPaymentMethod
);

module.exports = router;
