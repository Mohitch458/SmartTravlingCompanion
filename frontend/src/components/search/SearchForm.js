import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import SearchService from '../../services/search.service';

const schema = yup.object({
  searchType: yup.string()
    .required('Search type is required')
    .oneOf(['flight', 'hotel', 'bus', 'train']),
  origin: yup.string()
    .required('Origin is required'),
  destination: yup.string()
    .required('Destination is required'),
  departureDate: yup.date()
    .required('Departure date is required')
    .min(new Date(), 'Departure date must be in the future'),
  returnDate: yup.date()
    .nullable()
    .min(yup.ref('departureDate'), 'Return date must be after departure date'),
  passengerCount: yup.number()
    .required('Number of passengers is required')
    .min(1, 'At least 1 passenger is required')
    .max(9, 'Maximum 9 passengers allowed'),
  classType: yup.string()
    .required('Class type is required')
    .oneOf(['economy', 'business', 'first', 'all'])
}).required();

const SearchForm = ({ onSearchComplete }) => {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      searchType: 'flight',
      passengerCount: 1,
      classType: 'economy'
    }
  });

  const searchType = watch('searchType');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const result = await SearchService.searchTravel(data);
      onSearchComplete(result);
      toast.success('Search completed successfully!');
    } catch (error) {
      toast.error(error.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Search Type Selection */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Type
            </label>
            <div className="flex space-x-4">
              {['flight', 'hotel', 'bus', 'train'].map((type) => (
                <label key={type} className="inline-flex items-center">
                  <input
                    type="radio"
                    {...register('searchType')}
                    value={type}
                    className="form-radio h-4 w-4 text-indigo-600"
                  />
                  <span className="ml-2 capitalize">{type}</span>
                </label>
              ))}
            </div>
            {errors.searchType && (
              <p className="mt-1 text-sm text-red-600">{errors.searchType.message}</p>
            )}
          </div>

          {/* Origin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'hotel' ? 'City' : 'Origin'}
            </label>
            <input
              type="text"
              {...register('origin')}
              className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.origin && (
              <p className="mt-1 text-sm text-red-600">{errors.origin.message}</p>
            )}
          </div>

          {/* Destination */}
          {searchType !== 'hotel' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination
              </label>
              <input
                type="text"
                {...register('destination')}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {errors.destination && (
                <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
              )}
            </div>
          )}

          {/* Departure Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'hotel' ? 'Check-in Date' : 'Departure Date'}
            </label>
            <input
              type="date"
              {...register('departureDate')}
              className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.departureDate && (
              <p className="mt-1 text-sm text-red-600">{errors.departureDate.message}</p>
            )}
          </div>

          {/* Return Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'hotel' ? 'Check-out Date' : 'Return Date'}
            </label>
            <input
              type="date"
              {...register('returnDate')}
              className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.returnDate && (
              <p className="mt-1 text-sm text-red-600">{errors.returnDate.message}</p>
            )}
          </div>

          {/* Passenger Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'hotel' ? 'Number of Guests' : 'Number of Passengers'}
            </label>
            <input
              type="number"
              min="1"
              max="9"
              {...register('passengerCount')}
              className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {errors.passengerCount && (
              <p className="mt-1 text-sm text-red-600">{errors.passengerCount.message}</p>
            )}
          </div>

          {/* Class Type */}
          {searchType !== 'hotel' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Type
              </label>
              <select
                {...register('classType')}
                className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="economy">Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
                <option value="all">All Classes</option>
              </select>
              {errors.classType && (
                <p className="mt-1 text-sm text-red-600">{errors.classType.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;
