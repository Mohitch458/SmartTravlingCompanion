import axios from 'axios';
import { API_URL } from '../config';

const BookingService = {
  async createBooking(bookingData) {
    const response = await axios.post(`${API_URL}/bookings`, bookingData);
    return response.data;
  },

  async getBookings(params = {}) {
    const { status, type, page, limit } = params;
    const query = new URLSearchParams();
    if (status) query.append('status', status);
    if (type) query.append('type', type);
    if (page) query.append('page', page);
    if (limit) query.append('limit', limit);

    const response = await axios.get(`${API_URL}/bookings?${query}`);
    return response.data;
  },

  async getBooking(bookingId) {
    const response = await axios.get(`${API_URL}/bookings/${bookingId}`);
    return response.data;
  },

  async updateBooking(bookingId, updates) {
    const response = await axios.patch(`${API_URL}/bookings/${bookingId}`, updates);
    return response.data;
  },

  async cancelBooking(bookingId, reason) {
    const response = await axios.post(`${API_URL}/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },

  async processPayment(bookingId, paymentDetails) {
    const response = await axios.patch(`${API_URL}/bookings/${bookingId}/payment`, paymentDetails);
    return response.data;
  }
};

export default BookingService;
