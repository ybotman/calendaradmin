/**
 * Venue interface - matches backend venue schema
 * This replaces the Mongoose model and should be used for type hinting and documentation
 */

/**
 * @typedef {Object} Venue
 * @property {string} _id - MongoDB ID
 * @property {string} appId - Application identifier
 * @property {string} name - Venue name
 * @property {string} [shortName] - Short version of venue name
 * @property {string} [address1] - Address line 1
 * @property {string} [address2] - Address line 2
 * @property {string} [city] - City name
 * @property {string} [state] - State or province 
 * @property {string} [zip] - Postal code
 * @property {string} [country] - Country
 * @property {number} [latitude] - Latitude coordinate
 * @property {number} [longitude] - Longitude coordinate
 * @property {Object} [location] - GeoJSON location object
 * @property {string} location.type - GeoJSON type (always "Point")
 * @property {number[]} location.coordinates - GeoJSON coordinates [longitude, latitude]
 * @property {string} [phone] - Contact phone number
 * @property {string} [website] - Venue website URL
 * @property {string} [venueDetails] - Additional venue details
 * @property {string} [venueImageUrl] - URL to venue image
 * @property {boolean} [isActive] - Whether venue is active
 * @property {string} [nearestCityId] - ID of nearest city in geo hierarchy
 * @property {string} [masteredCityName] - Name of nearest city from geo hierarchy
 * @property {string} [masteredDivisionName] - Name of division from geo hierarchy 
 * @property {string} [masteredRegionName] - Name of region from geo hierarchy
 */

/**
 * Default empty venue object with required fields
 * Used for initializing new venues
 */
export const defaultVenue = {
  appId: '1',
  name: '',
  shortName: '',
  address1: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  latitude: 0,
  longitude: 0,
  location: {
    type: 'Point',
    coordinates: [0, 0]
  },
  isActive: true
};

export default {
  defaultVenue
};