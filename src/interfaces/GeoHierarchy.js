/**
 * GeoHierarchy interfaces - matches backend geo hierarchy schema
 * This replaces direct Mongoose models and should be used for type hinting and documentation
 */

/**
 * @typedef {Object} Country
 * @property {string} _id - MongoDB ID
 * @property {string} appId - Application identifier
 * @property {string} countryName - Country name
 * @property {string} countryCode - ISO country code
 * @property {string} continent - Continent name
 * @property {boolean} active - Whether country is active
 */

/**
 * @typedef {Object} Region
 * @property {string} _id - MongoDB ID
 * @property {string} appId - Application identifier
 * @property {string} regionName - Region name
 * @property {string} regionCode - Region code
 * @property {boolean} active - Whether region is active
 * @property {string} masteredCountryId - ID of parent country
 * @property {Country} [masteredCountryId] - Populated country object (when using populate)
 */

/**
 * @typedef {Object} Division
 * @property {string} _id - MongoDB ID
 * @property {string} appId - Application identifier
 * @property {string} divisionName - Division name
 * @property {string} divisionCode - Division code
 * @property {boolean} active - Whether division is active
 * @property {string} masteredRegionId - ID of parent region
 * @property {Region} [masteredRegionId] - Populated region object (when using populate)
 * @property {string[]} states - List of states in this division
 */

/**
 * @typedef {Object} City
 * @property {string} _id - MongoDB ID
 * @property {string} appId - Application identifier
 * @property {string} cityName - City name
 * @property {string} cityCode - City code
 * @property {number} latitude - Latitude coordinate
 * @property {number} longitude - Longitude coordinate
 * @property {Object} location - GeoJSON location object
 * @property {string} location.type - GeoJSON type (always "Point")
 * @property {number[]} location.coordinates - GeoJSON coordinates [longitude, latitude]
 * @property {boolean} isActive - Whether city is active
 * @property {string} masteredDivisionId - ID of parent division
 * @property {Division} [masteredDivisionId] - Populated division object (when using populate)
 */

/**
 * @typedef {Object} GeoHierarchy
 * @property {Country[]} countries - List of countries
 * @property {Region[]} regions - List of regions
 * @property {Division[]} divisions - List of divisions
 * @property {City[]} cities - List of cities
 */

export const defaultCountry = {
  appId: '1',
  countryName: '',
  countryCode: '',
  continent: '',
  active: true
};

export const defaultRegion = {
  appId: '1',
  regionName: '',
  regionCode: '',
  active: true,
  masteredCountryId: ''
};

export const defaultDivision = {
  appId: '1',
  divisionName: '',
  divisionCode: '',
  active: true,
  masteredRegionId: '',
  states: []
};

export const defaultCity = {
  appId: '1',
  cityName: '',
  cityCode: '',
  latitude: 0,
  longitude: 0,
  location: {
    type: 'Point',
    coordinates: [0, 0]
  },
  isActive: true,
  masteredDivisionId: ''
};

export default {
  defaultCountry,
  defaultRegion,
  defaultDivision,
  defaultCity
};