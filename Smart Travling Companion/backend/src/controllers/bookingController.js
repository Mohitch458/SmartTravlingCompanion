const Booking = require('../models/Booking');
const User = require('../models/User');
const notificationService = require('../services/notification.service');

exports.createBooking = async (req, res) => {
  try {
    const { bookingType, bookingDetails } = req.body;
    const userId = req.user.id;

    const booking = new Booking({
      userId,
      bookingType,
      bookingDetails,
      status: 'pending',
      paymentStatus: 'pending'
    });

    await booking.save();

    const user = await User.findById(userId);
    const notification = await notificationService.sendBookingConfirmation(booking, user);
    
    booking.notifications.push(notification);
    await booking.save();

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type, page = 1, limit = 10 } = req.query;

    const query = { userId };
    if (status) query.status = status;
    if (type) query.bookingType = type;

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
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

exports.getBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    const booking = await Booking.findOne({ bookingId, userId });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const booking = await Booking.findOne({ bookingId, userId });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (!booking.canModify()) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be modified at this time'
      });
    }

    // Only allow updating specific fields
    const allowedUpdates = ['bookingDetails.specialRequests'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        booking.set(key, updates[key]);
      }
    });

    const user = await User.findById(userId);
    const notification = await notificationService.sendBookingConfirmation(booking, user);
    booking.notifications.push(notification);

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const booking = await Booking.findOne({ bookingId, userId });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    if (!booking.canCancel()) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be canceled at this time'
      });
    }

    const refundAmount = booking.calculateRefundAmount();
    
    booking.status = 'canceled';
    booking.cancellation = {
      canceledAt: new Date(),
      reason,
      refundAmount,
      refundStatus: refundAmount > 0 ? 'pending' : null
    };

    const user = await User.findById(userId);
    const notification = await notificationService.sendCancellationConfirmation(booking, user);
    booking.notifications.push(notification);

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentStatus, transactionId } = req.body;

    const booking = await Booking.findOne({ bookingId });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    booking.paymentStatus = paymentStatus;
    booking.paymentDetails = {
      ...booking.paymentDetails,
      transactionId,
      paidAt: new Date()
    };

    if (paymentStatus === 'paid') {
      booking.status = 'confirmed';
    }

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
