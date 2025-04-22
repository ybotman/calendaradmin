/**
 * Event interface - matches backend Events schema
 * This replaces the Mongoose model and should be used for type hinting and documentation
 */

/**
 * @typedef {Object} Event
 * @property {string} _id - MongoDB ID
 * @property {string} appId - Application identifier
 * @property {string} title - Event title
 * @property {string} [standardsTitle] - Optional standardized title
 * @property {string} [shortTitle] - Optional short title
 * @property {string} [description] - Event description
 * @property {Date} startDate - Event start date/time
 * @property {Date} endDate - Event end date/time
 * @property {string} [categoryFirst] - Primary category
 * @property {string} [categorySecond] - Secondary category
 * @property {string} [categoryThird] - Tertiary category
 * @property {string} [categoryFirstId] - Primary category ID
 * @property {string} [categorySecondId] - Secondary category ID
 * @property {string} [categoryThirdId] - Tertiary category ID
 * @property {string} [masteredRegionName] - Region name
 * @property {string} [masteredDivisionName] - Division name
 * @property {string} [masteredCityName] - City name
 * @property {string} ownerOrganizerID - ID of owner organizer
 * @property {string} ownerOrganizerName - Name of owner organizer
 * @property {string} [grantedOrganizerID] - ID of granted organizer
 * @property {string} [grantedOrganizerName] - Name of granted organizer
 * @property {string} [alternateOrganizerID] - ID of alternate organizer
 * @property {string} [alternateOrganizerName] - Name of alternate organizer
 * @property {string} [locationName] - Name of location
 * @property {string} [venueID] - ID of venue
 * @property {string} [locationID] - ID of location
 * @property {Object} [venueGeolocation] - Geolocation data for venue
 * @property {string} [venueGeolocation.type] - Type of geolocation (usually "Point")
 * @property {number[]} [venueGeolocation.coordinates] - Coordinates [longitude, latitude]
 * @property {string} [recurrenceRule] - Rule for recurring events
 * @property {boolean} isDiscovered - Whether event is discovered
 * @property {boolean} isOwnerManaged - Whether event is managed by owner
 * @property {boolean} isActive - Whether event is active
 * @property {boolean} isFeatured - Whether event is featured
 * @property {boolean} [isCanceled] - Whether event is canceled
 * @property {boolean} [isRepeating] - Whether event is recurring
 * @property {Date} [discoveredLastDate] - Last discovered date
 * @property {Date} [discoveredFirstDate] - First discovered date
 * @property {string} [discoveredComments] - Comments from discovery
 * @property {string} [cost] - Event cost information
 * @property {string} [eventImage] - URL to event image
 * @property {string} [bannerImage] - URL to banner image
 * @property {string} [featuredImage] - URL to featured image
 * @property {string[]} [seriesImages] - URLs to series images
 * @property {Date} expiresAt - Expiration date
 */

/**
 * Default empty event object with required fields
 * Used for initializing new events
 */
export const defaultEvent = {
  appId: '1',
  title: '',
  startDate: new Date(),
  endDate: new Date(new Date().setHours(new Date().getHours() + 2)),
  ownerOrganizerID: '',
  ownerOrganizerName: '',
  isDiscovered: false,
  isOwnerManaged: true,
  isActive: true,
  expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
};

export default {
  defaultEvent
};