const { validationResult } = require('express-validator');
const SearchHistory = require('../models/SearchHistory');
const travelAPI = require('../services/travelAPI');

exports.search = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      searchType,
      origin,
      destination,
      departureDate,
      returnDate,
      passengerCount,
      classType
    } = req.body;

    let results;
    switch (searchType) {
      case 'flight':
        results = await travelAPI.searchFlights({
          origin,
          destination,
          departureDate,
          returnDate,
          passengerCount,
          classType
        });
        break;
      case 'hotel':
        results = await travelAPI.searchHotels({
          destination,
          checkIn: departureDate,
          checkOut: returnDate,
          rooms: Math.ceil(passengerCount / 2),
          guests: passengerCount
        });
        break;
      // Add more search types as needed
      default:
        return res.status(400).json({ message: 'Invalid search type' });
    }

    // Save search history
    const searchHistory = new SearchHistory({
      userId: req.user.userId,
      searchType,
      origin,
      destination,
      departureDate,
      returnDate,
      passengerCount,
      classType,
      results
    });

    await searchHistory.save();

    res.json({
      searchId: searchHistory.searchId,
      results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};

exports.getSearchHistory = async (req, res) => {
  try {
    const searches = await SearchHistory.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(searches);
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ message: 'Failed to fetch search history' });
  }
};

exports.getSearchById = async (req, res) => {
  try {
    const search = await SearchHistory.findOne({
      searchId: req.params.searchId,
      userId: req.user.userId
    });

    if (!search) {
      return res.status(404).json({ message: 'Search not found' });
    }

    res.json(search);
  } catch (error) {
    console.error('Get search by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch search' });
  }
};

exports.getMockResults = async (req, res) => {
  try {
    const { searchType } = req.query;
    let results;

    switch (searchType) {
      case 'flight':
        results = travelAPI.getMockFlights();
        break;
      case 'hotel':
        results = travelAPI.getMockHotels();
        break;
      default:
        return res.status(400).json({ message: 'Invalid search type' });
    }

    res.json({ results });
  } catch (error) {
    console.error('Get mock results error:', error);
    res.status(500).json({ message: 'Failed to fetch mock results' });
  }
};
