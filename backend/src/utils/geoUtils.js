/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param {Array} point1 [longitude, latitude]
 * @param {Array} point2 [longitude, latitude]
 * @returns {number} Distance in kilometers
 */
exports.calculateDistance = function(point1, point2) {
  const R = 6371; // Earth's radius in kilometers
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate the bearing between two points
 * @param {Array} point1 [longitude, latitude]
 * @param {Array} point2 [longitude, latitude]
 * @returns {number} Bearing in degrees
 */
exports.calculateBearing = function(point1, point2) {
  const [lon1, lat1] = point1.map(toRad);
  const [lon2, lat2] = point2.map(toRad);

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  const bearing = toDeg(Math.atan2(y, x));

  return (bearing + 360) % 360;
};

/**
 * Calculate estimated time of arrival based on distance and average speed
 * @param {number} distance Distance in kilometers
 * @param {number} avgSpeed Average speed in km/h
 * @returns {number} ETA in minutes
 */
exports.calculateETA = function(distance, avgSpeed = 30) {
  return Math.round((distance / avgSpeed) * 60);
};

/**
 * Check if a point is within a given radius of another point
 * @param {Array} center [longitude, latitude]
 * @param {Array} point [longitude, latitude]
 * @param {number} radius Radius in kilometers
 * @returns {boolean}
 */
exports.isWithinRadius = function(center, point, radius) {
  const distance = exports.calculateDistance(center, point);
  return distance <= radius;
};

/**
 * Get a bounding box around a point for quick geospatial queries
 * @param {Array} center [longitude, latitude]
 * @param {number} radius Radius in kilometers
 * @returns {Object} Bounding box coordinates
 */
exports.getBoundingBox = function(center, radius) {
  const [lon, lat] = center;
  const R = 6371; // Earth's radius in kilometers

  const latChange = (radius / R) * (180 / Math.PI);
  const lonChange = (radius / R) * (180 / Math.PI) / Math.cos(toRad(lat));

  return {
    minLat: lat - latChange,
    maxLat: lat + latChange,
    minLon: lon - lonChange,
    maxLon: lon + lonChange
  };
};

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 * @param {number} radians
 * @returns {number} Degrees
 */
function toDeg(radians) {
  return radians * 180 / Math.PI;
}
