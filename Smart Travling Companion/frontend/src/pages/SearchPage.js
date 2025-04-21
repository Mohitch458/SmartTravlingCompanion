import React, { useState } from 'react';
import SearchForm from '../components/search/SearchForm';
import SearchResults from '../components/search/SearchResults';
import { useAuth } from '../contexts/AuthContext';

const SearchPage = () => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState(null);
  const [searchType, setSearchType] = useState('flight');

  const handleSearchComplete = (results) => {
    setSearchResults(results.results);
    setSearchType(results.searchType);
    // Scroll to results
    window.scrollTo({
      top: document.getElementById('search-results').offsetTop - 20,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Your Perfect Trip
          </h1>
          <p className="mt-2 text-gray-600">
            Search for flights, hotels, and more
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <SearchForm onSearchComplete={handleSearchComplete} />
        </div>

        {/* Search Results */}
        <div id="search-results">
          {searchResults && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Search Results
              </h2>
              <SearchResults
                results={searchResults}
                searchType={searchType}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
