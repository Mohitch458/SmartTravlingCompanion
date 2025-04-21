const express = require('express');
const { body } = require('express-validator');
const searchController = require('../controllers/searchController');
const auth = require('../middleware/auth');

const router = express.Router();

const searchValidation = [
  body('searchType')
    .isIn(['flight', 'hotel', 'bus', 'train'])
    .withMessage('Invalid search type'),
  body('origin')
    .notEmpty()
    .withMessage('Origin is required'),
  body('destination')
    .notEmpty()
    .withMessage('Destination is required'),
  body('departureDate')
    .isISO8601()
    .withMessage('Invalid departure date'),
  body('returnDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid return date'),
  body('passengerCount')
    .isInt({ min: 1 })
    .withMessage('Invalid passenger count'),
  body('classType')
    .isIn(['economy', 'business', 'first', 'all'])
    .withMessage('Invalid class type')
];

router.post('/search', auth, searchValidation, searchController.search);
router.get('/history', auth, searchController.getSearchHistory);
router.get('/search/:searchId', auth, searchController.getSearchById);
router.get('/mock', auth, searchController.getMockResults);

module.exports = router;
