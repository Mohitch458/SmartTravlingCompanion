const rideService = require('../services/ride.service');
const { validationResult } = require('express-validator');

exports.requestRide = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pickupLocation, dropoffLocation, rideType } = req.body;
    const userId = req.user.id;

    const ride = await rideService.requestRide(
      userId,
      pickupLocation,
      dropoffLocation,
      rideType
    );

    res.status(201).json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    const ride = await rideService.getRideStatus(rideId, userId);

    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updateRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const ride = await rideService.updateRideStatus(rideId, status, userId);

    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { coordinates } = req.body;
    const driverId = req.user.id;

    const update = await rideService.updateRideLocation(rideId, driverId, coordinates);

    res.status(200).json({
      success: true,
      data: update
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const ride = await rideService.updateRideStatus(rideId, 'canceled', userId);

    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user.id;

    const ride = await rideService.updateRideStatus(rideId, 'completed', driverId);

    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.rateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.id;
    const isDriver = req.user.role === 'driver';

    const ride = await rideService.rateRide(rideId, userId, isDriver, rating, feedback);

    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getRideHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('driverId', 'name vehicleDetails ratings');

    const total = await Ride.countDocuments(query);

    res.status(200).json({
      success: true,
      data: rides,
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

exports.getActiveRide = async (req, res) => {
  try {
    const userId = req.user.id;
    const isDriver = req.user.role === 'driver';

    const query = isDriver ? { driverId: userId } : { userId };
    query.status = { $in: ['accepted', 'arrived', 'inProgress'] };

    const ride = await Ride.findOne(query)
      .populate('driverId', 'name vehicleDetails currentLocation ratings')
      .populate('userId', 'name phone');

    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'No active ride found'
      });
    }

    res.status(200).json({
      success: true,
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
