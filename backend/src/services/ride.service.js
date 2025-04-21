const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const NotificationService = require('./notification.service');
const { calculateDistance } = require('../utils/geoUtils');

class RideService {
  constructor() {
    this.activeRides = new Map(); // In-memory store for active rides
  }

  async requestRide(userId, pickupLocation, dropoffLocation, rideType) {
    // Find nearby drivers
    const drivers = await Driver.findNearbyDrivers(pickupLocation.coordinates);
    
    if (drivers.length === 0) {
      throw new Error('No drivers available nearby');
    }

    // Calculate estimated distance and duration
    const distance = calculateDistance(
      pickupLocation.coordinates,
      dropoffLocation.coordinates
    );
    const estimatedDuration = Math.round(distance * 3); // Rough estimate: 3 minutes per km

    // Create new ride request
    const ride = new Ride({
      userId,
      pickupLocation,
      dropoffLocation,
      rideType,
      distance: {
        estimated: distance,
        unit: 'km'
      },
      duration: {
        estimated: estimatedDuration,
        unit: 'minutes'
      },
      paymentMethod: 'cash' // Default to cash
    });

    // Calculate initial fare
    ride.calculateFare(distance, estimatedDuration);
    await ride.save();

    // Start driver matching process
    this.findDriver(ride, drivers);

    return ride;
  }

  async findDriver(ride, nearbyDrivers) {
    for (const driver of nearbyDrivers) {
      if (driver.status === 'available') {
        try {
          // Update driver status
          driver.status = 'engaged';
          driver.currentRide = ride._id;
          await driver.save();

          // Update ride with driver
          ride.driverId = driver._id;
          ride.status = 'accepted';
          await ride.updateStatus('accepted');

          // Store in active rides
          this.activeRides.set(ride.rideId, {
            ride,
            driver,
            lastLocation: driver.currentLocation
          });

          return true;
        } catch (error) {
          console.error('Error assigning driver:', error);
          continue;
        }
      }
    }
    return false;
  }

  async updateRideLocation(rideId, driverId, coordinates) {
    const activeRide = this.activeRides.get(rideId);
    if (!activeRide || activeRide.driver._id.toString() !== driverId) {
      throw new Error('Invalid ride or driver');
    }

    // Update driver location
    await activeRide.driver.updateLocation(coordinates);

    // Add coordinate to ride route
    await activeRide.ride.addRoutePoint(coordinates);

    // Update last known location
    activeRide.lastLocation = { type: 'Point', coordinates };
    
    return {
      rideId,
      status: activeRide.ride.status,
      currentLocation: coordinates
    };
  }

  async updateRideStatus(rideId, status, userId) {
    const ride = await Ride.findOne({ rideId });
    if (!ride) {
      throw new Error('Ride not found');
    }

    // Validate status transition
    if (!this.isValidStatusTransition(ride.status, status)) {
      throw new Error('Invalid status transition');
    }

    await ride.updateStatus(status);

    // Handle status-specific logic
    switch (status) {
      case 'arrived':
        // Driver has arrived at pickup location
        break;
      
      case 'inProgress':
        // Ride has started
        ride.timing.started = new Date();
        break;
      
      case 'completed':
        await this.completeRide(ride);
        break;
      
      case 'canceled':
        await this.cancelRide(ride, userId);
        break;
    }

    await ride.save();
    return ride;
  }

  async completeRide(ride) {
    // Calculate final fare based on actual distance and duration
    await ride.completeRide();
    
    // Update driver statistics
    const driver = await Driver.findById(ride.driverId);
    await driver.updateStatistics(ride.fare.total, ride.distance.actual);
    
    // Clear from active rides
    this.activeRides.delete(ride.rideId);
    
    // Update driver status
    driver.status = 'available';
    driver.currentRide = null;
    await driver.save();
  }

  async cancelRide(ride, canceledBy) {
    const now = new Date();
    ride.cancellation = {
      reason: 'User canceled',
      by: canceledBy === ride.userId ? 'rider' : 'driver',
      at: now
    };

    if (ride.driverId) {
      const driver = await Driver.findById(ride.driverId);
      driver.status = 'available';
      driver.currentRide = null;
      await driver.save();
    }

    this.activeRides.delete(ride.rideId);
  }

  async rateRide(rideId, userId, isDriver, rating, feedback) {
    const ride = await Ride.findOne({ rideId });
    if (!ride) {
      throw new Error('Ride not found');
    }

    if (isDriver) {
      ride.rating.rider = { rating, feedback };
    } else {
      ride.rating.driver = { rating, feedback };
      // Update driver rating
      const driver = await Driver.findById(ride.driverId);
      await driver.updateRating(rating);
    }

    await ride.save();
    return ride;
  }

  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      requested: ['searching', 'canceled'],
      searching: ['accepted', 'canceled'],
      accepted: ['arrived', 'canceled'],
      arrived: ['inProgress', 'canceled'],
      inProgress: ['completed', 'canceled'],
      completed: [],
      canceled: []
    };

    return validTransitions[currentStatus].includes(newStatus);
  }
}

module.exports = new RideService();
