const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation schemas
const updatePreferencesSchema = [
  body('channels')
    .optional()
    .isObject()
    .withMessage('Channels must be an object'),
  body('channels.*.enabled')
    .optional()
    .isBoolean()
    .withMessage('Channel enabled status must be a boolean'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('preferences.*.enabled')
    .optional()
    .isBoolean()
    .withMessage('Preference enabled status must be a boolean'),
  body('preferences.*.channels')
    .optional()
    .isObject()
    .withMessage('Preference channels must be an object'),
  body('quietHours')
    .optional()
    .isObject()
    .withMessage('Quiet hours must be an object'),
  body('quietHours.enabled')
    .optional()
    .isBoolean()
    .withMessage('Quiet hours enabled status must be a boolean'),
  body('quietHours.start')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:mm format'),
  body('quietHours.end')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:mm format')
];

const pushTokenSchema = [
  body('token')
    .isString()
    .notEmpty()
    .withMessage('Push token is required'),
  body('device')
    .isString()
    .notEmpty()
    .withMessage('Device information is required'),
  body('platform')
    .isIn(['android', 'ios', 'web'])
    .withMessage('Invalid platform')
];

// Notification routes
router.get('/',
  auth,
  notificationController.getNotifications
);

router.get('/unread-count',
  auth,
  notificationController.getUnreadCount
);

router.patch('/:notificationId/read',
  auth,
  notificationController.markAsRead
);

router.patch('/mark-all-read',
  auth,
  notificationController.markAllAsRead
);

router.delete('/:notificationId',
  auth,
  notificationController.deleteNotification
);

// Preference routes
router.get('/preferences',
  auth,
  notificationController.getPreferences
);

router.patch('/preferences',
  auth,
  updatePreferencesSchema,
  validate,
  notificationController.updatePreferences
);

// Push notification token routes
router.post('/push-token',
  auth,
  pushTokenSchema,
  validate,
  notificationController.registerPushToken
);

router.delete('/push-token',
  auth,
  body('token')
    .isString()
    .notEmpty()
    .withMessage('Push token is required'),
  validate,
  notificationController.unregisterPushToken
);

module.exports = router;
