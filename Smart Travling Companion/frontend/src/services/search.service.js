import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const searchTravel = async (searchParams) => {
  try {
    const response = await axios.post(`${API_URL}/search/search`, searchParams);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Search failed' };
  }
};

const getSearchHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/search/history`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch search history' };
  }
};

const getSearchById = async (searchId) => {
  try {
    const response = await axios.get(`${API_URL}/search/search/${searchId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch search' };
  }
};

const getMockResults = async (searchType) => {
  try {
    const response = await axios.get(`${API_URL}/search/mock`, {
      params: { searchType }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch mock results' };
  }
};

const SearchService = {
  searchTravel,
  getSearchHistory,
  getSearchById,
  getMockResults,
};

export default SearchService;
