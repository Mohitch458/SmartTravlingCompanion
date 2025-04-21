import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BookingService from '../../services/booking.service';

const BookingDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await BookingService.getBooking(bookingId);
      setBooking(response.data);
    } catch (error) {
      toast.error('Failed to fetch booking details');
      navigate('/bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await BookingService.cancelBooking(bookingId, cancelReason);
      toast.success('Booking canceled successfully');
      setShowCancelModal(false);
      fetchBooking(); // Refresh booking details
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!booking) return null;

  const isFlightBooking = booking.bookingType === 'flight';
  const details = isFlightBooking ? booking.bookingDetails.flight : booking.bookingDetails.hotel;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isFlightBooking ? 'Flight Booking' : 'Hotel Booking'}
            </h2>
            <p className="text-gray-600">Booking ID: {booking.bookingId}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
              ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                booking.status === 'canceled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              {booking.status}
            </span>
            <p className="mt-1 text-sm text-gray-500">
              Booked on {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        {isFlightBooking ? (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Departure</h3>
                <p className="text-gray-600">
                  <span className="block text-2xl font-bold">{details.departure.time.slice(11, 16)}</span>
                  <span className="block">{details.departure.airport}</span>
                  <span className="block text-sm">Terminal {details.departure.terminal}</span>
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Arrival</h3>
                <p className="text-gray-600">
                  <span className="block text-2xl font-bold">{details.arrival.time.slice(11, 16)}</span>
                  <span className="block">{details.arrival.airport}</span>
                  <span className="block text-sm">Terminal {details.arrival.terminal}</span>
                </p>
              </div>
            </div>
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Flight Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-600">
                    <span className="block">Airline: {details.airline}</span>
                    <span className="block">Flight: {details.flightNumber}</span>
                    <span className="block">Class: {details.classType}</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">
                    <span className="block">Seats: {details.seatNumbers.join(', ')}</span>
                    <span className="block">Passengers: {booking.bookingDetails.passengerCount}</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4">Hotel Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600">
                  <span className="block font-medium">{details.name}</span>
                  <span className="block">{details.address}</span>
                </p>
              </div>
              <div>
                <p className="text-gray-600">
                  <span className="block">Check-in: {new Date(details.checkIn).toLocaleDateString()}</span>
                  <span className="block">Check-out: {new Date(details.checkOut).toLocaleDateString()}</span>
                  <span className="block">Room Type: {details.roomType}</span>
                  <span className="block">Rooms: {details.roomCount}</span>
                  <span className="block">Guests: {booking.bookingDetails.passengerCount}</span>
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Details */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-600">
              <span className="block">Amount: {booking.bookingDetails.price.amount} {booking.bookingDetails.price.currency}</span>
              <span className="block">Status: {booking.paymentStatus}</span>
            </p>
          </div>
          {booking.paymentDetails?.transactionId && (
            <div>
              <p className="text-gray-600">
                <span className="block">Transaction ID: {booking.paymentDetails.transactionId}</span>
                <span className="block">Paid on: {new Date(booking.paymentDetails.paidAt).toLocaleDateString()}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {booking.status !== 'canceled' && (
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
            disabled={!booking.canCancel}
          >
            Cancel Booking
          </button>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Cancel Booking</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for cancellation. Note that cancellation fees may apply.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="form-textarea w-full mb-4"
              rows="3"
              placeholder="Enter cancellation reason"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={!cancelReason.trim()}
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetails;
