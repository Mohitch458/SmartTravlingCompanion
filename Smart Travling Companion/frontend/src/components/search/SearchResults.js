import React, { useState } from 'react';

const SearchResults = ({ results, searchType }) => {
  const [sortBy, setSortBy] = useState('price');
  const [filterBy, setFilterBy] = useState({
    priceRange: [0, 100000],
    stops: 'all', // for flights
    rating: 0, // for hotels
  });

  const getSortedResults = () => {
    if (!results) return [];
    
    return [...results].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price.amount - b.price.amount;
        case 'duration':
          return searchType === 'flight' ? 
            a.duration.localeCompare(b.duration) : 0;
        case 'rating':
          return searchType === 'hotel' ? 
            b.rating - a.rating : 0;
        default:
          return 0;
      }
    });
  };

  const getFilteredResults = () => {
    return getSortedResults().filter(item => {
      const priceInRange = item.price.amount >= filterBy.priceRange[0] &&
        item.price.amount <= filterBy.priceRange[1];

      if (searchType === 'flight') {
        if (filterBy.stops === 'nonstop' && item.stops > 0) return false;
        if (filterBy.stops === '1stop' && item.stops !== 1) return false;
      }

      if (searchType === 'hotel') {
        if (item.rating < filterBy.rating) return false;
      }

      return priceInRange;
    });
  };

  const renderFlightResult = (flight) => (
    <div key={flight.id} className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{flight.airline}</h3>
          <p className="text-gray-600">Flight {flight.flightNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-indigo-600">
            {flight.price.amount} {flight.price.currency}
          </p>
          <p className="text-sm text-gray-500">{flight.classType}</p>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div>
          <p className="font-semibold">{flight.departure.time}</p>
          <p className="text-sm text-gray-600">{flight.departure.airport}</p>
        </div>
        <div className="flex-1 mx-4 text-center">
          <p className="text-sm text-gray-500">{flight.duration}</p>
          <div className="relative">
            <div className="border-t-2 border-gray-300 my-2"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2">
              {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{flight.arrival.time}</p>
          <p className="text-sm text-gray-600">{flight.arrival.airport}</p>
        </div>
      </div>
    </div>
  );

  const renderHotelResult = (hotel) => (
    <div key={hotel.id} className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="flex">
        <div className="flex-shrink-0 w-32 h-32">
          <img
            src={hotel.images[0]}
            alt={hotel.name}
            className="w-full h-full object-cover rounded"
          />
        </div>
        <div className="ml-4 flex-1">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">{hotel.name}</h3>
              <p className="text-gray-600">{hotel.address}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-indigo-600">
                {hotel.rooms[0].price.amount} {hotel.rooms[0].price.currency}
              </p>
              <p className="text-sm text-gray-500">per night</p>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="flex items-center">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`h-5 w-5 ${i < Math.floor(hotel.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="ml-2 text-gray-600">{hotel.rating} / 5</span>
            </div>
          </div>
          
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              {hotel.amenities.slice(0, 4).join(' • ')}
              {hotel.amenities.length > 4 && ' • ...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const filteredResults = getFilteredResults();

  return (
    <div className="space-y-6">
      {/* Filters and Sort */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="price">Price</option>
              {searchType === 'flight' && <option value="duration">Duration</option>}
              {searchType === 'hotel' && <option value="rating">Rating</option>}
            </select>
          </div>

          {searchType === 'flight' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stops
              </label>
              <select
                value={filterBy.stops}
                onChange={(e) => setFilterBy({ ...filterBy, stops: e.target.value })}
                className="form-select rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="all">All</option>
                <option value="nonstop">Non-stop only</option>
                <option value="1stop">1 stop</option>
              </select>
            </div>
          )}

          {searchType === 'hotel' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Rating
              </label>
              <select
                value={filterBy.rating}
                onChange={(e) => setFilterBy({ ...filterBy, rating: Number(e.target.value) })}
                className="form-select rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="0">All</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No results found matching your criteria
          </div>
        ) : (
          filteredResults.map((result) =>
            searchType === 'flight'
              ? renderFlightResult(result)
              : renderHotelResult(result)
          )
        )}
      </div>
    </div>
  );
};

export default SearchResults;
