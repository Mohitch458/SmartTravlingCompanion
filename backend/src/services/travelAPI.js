const axios = require('axios');

class TravelAPI {
  constructor() {
    this.flightAPI = axios.create({
      baseURL: process.env.FLIGHT_API_URL,
      headers: {
        'Authorization': `Bearer ${process.env.FLIGHT_API_KEY}`
      }
    });

    this.hotelAPI = axios.create({
      baseURL: process.env.HOTEL_API_URL,
      headers: {
        'Authorization': `Bearer ${process.env.HOTEL_API_KEY}`
      }
    });
  }

  async searchFlights({
    origin,
    destination,
    departureDate,
    returnDate,
    passengerCount,
    classType
  }) {
    try {
      const response = await this.flightAPI.get('/search', {
        params: {
          origin,
          destination,
          departure_date: departureDate,
          return_date: returnDate,
          adults: passengerCount,
          class: classType
        }
      });

      return this.formatFlightResults(response.data);
    } catch (error) {
      console.error('Flight search error:', error);
      throw new Error('Failed to search flights');
    }
  }

  async searchHotels({
    destination,
    checkIn,
    checkOut,
    rooms,
    guests
  }) {
    try {
      const response = await this.hotelAPI.get('/search', {
        params: {
          city: destination,
          check_in: checkIn,
          check_out: checkOut,
          rooms,
          guests
        }
      });

      return this.formatHotelResults(response.data);
    } catch (error) {
      console.error('Hotel search error:', error);
      throw new Error('Failed to search hotels');
    }
  }

  formatFlightResults(data) {
    return data.map(flight => ({
      id: flight.id,
      airline: flight.airline,
      flightNumber: flight.flight_number,
      departure: {
        airport: flight.departure_airport,
        time: flight.departure_time,
        terminal: flight.departure_terminal
      },
      arrival: {
        airport: flight.arrival_airport,
        time: flight.arrival_time,
        terminal: flight.arrival_terminal
      },
      duration: flight.duration,
      stops: flight.stops,
      price: {
        amount: flight.price,
        currency: flight.currency
      },
      seatsAvailable: flight.available_seats,
      classType: flight.class_type
    }));
  }

  formatHotelResults(data) {
    return data.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      address: hotel.address,
      rating: hotel.rating,
      amenities: hotel.amenities,
      images: hotel.images,
      rooms: hotel.rooms.map(room => ({
        id: room.id,
        type: room.type,
        price: {
          amount: room.price,
          currency: room.currency
        },
        capacity: room.capacity,
        amenities: room.amenities
      }))
    }));
  }

  // Mock data for development/testing
  getMockFlights() {
    return [
      {
        id: 'FL001',
        airline: 'IndiGo',
        flightNumber: '6E-123',
        departure: {
          airport: 'DEL',
          time: '2025-05-01T10:00:00Z',
          terminal: 'T3'
        },
        arrival: {
          airport: 'BOM',
          time: '2025-05-01T12:00:00Z',
          terminal: 'T2'
        },
        duration: '2h',
        stops: 0,
        price: {
          amount: 5000,
          currency: 'INR'
        },
        seatsAvailable: 45,
        classType: 'economy'
      },
      // Add more mock flights...
    ];
  }

  getMockHotels() {
    return [
      {
        id: 'HT001',
        name: 'Luxury Palace Hotel',
        address: 'Mumbai Central, Mumbai',
        rating: 4.5,
        amenities: ['wifi', 'pool', 'spa', 'restaurant'],
        images: ['hotel1.jpg', 'hotel2.jpg'],
        rooms: [
          {
            id: 'RM001',
            type: 'Deluxe',
            price: {
              amount: 8000,
              currency: 'INR'
            },
            capacity: 2,
            amenities: ['tv', 'minibar', 'ac']
          }
        ]
      },
      // Add more mock hotels...
    ];
  }
}

module.exports = new TravelAPI();
