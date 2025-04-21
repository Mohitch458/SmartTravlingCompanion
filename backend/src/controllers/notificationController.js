const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const { validationResult } = require('express-validator');

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, read } = req.query;
    const query = { userId: req.user.id };

    if (type) {
      query.type = type;
    }
    if (read !== undefined) {
      query['readStatus.isRead'] = read === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('reference.id');

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const preferences = await NotificationPreference.findOne({ userId: req.user.id });
    
    if (!preferences) {
      return res.status(404).json({
        success: false,
        error: 'Notification preferences not found'
      });
    }

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let preferences = await NotificationPreference.findOne({ userId: req.user.id });
    
    if (!preferences) {
      preferences = new NotificationPreference({ userId: req.user.id });
    }

    // Update channels
    if (req.body.channels) {
      Object.keys(req.body.channels).forEach(channel => {
        if (preferences.channels[channel]) {
          Object.assign(preferences.channels[channel], req.body.channels[channel]);
        }
      });
    }

    // Update notification type preferences
    if (req.body.preferences) {
      Object.keys(req.body.preferences).forEach(type => {
        if (preferences.preferences[type]) {
          Object.assign(preferences.preferences[type], req.body.preferences[type]);
        }
      });
    }

    // Update quiet hours
    if (req.body.quietHours) {
      Object.assign(preferences.quietHours, req.body.quietHours);
    }

    await preferences.save();

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.registerPushToken = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, device, platform } = req.body;
    let preferences = await NotificationPreference.findOne({ userId: req.user.id });
    
    if (!preferences) {
      preferences = new NotificationPreference({ userId: req.user.id });
    }

    await preferences.addPushToken(token, device, platform);

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.unregisterPushToken = async (req, res) => {
  try {
    const { token } = req.body;
    const preferences = await NotificationPreference.findOne({ userId: req.user.id });
    
    if (preferences) {
      await preferences.removePushToken(token);
    }

    res.status(200).json({
      success: true,
      message: 'Push token unregistered successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
