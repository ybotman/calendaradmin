/**
 * Formats an organizer object for creation
 * 
 * @param {Object} organizerData - Raw organizer data
 * @param {string} appId - Application ID
 * @returns {Object} Formatted organizer data
 */
export function formatOrganizerForCreate(organizerData, appId) {
  return {
    ...organizerData,
    appId: appId,
    name: organizerData.name || organizerData.fullName,
    fullName: organizerData.fullName || organizerData.name,
    shortName: organizerData.shortName || '',
    isActive: organizerData.isActive === true ? true : false,
    isEnabled: organizerData.isEnabled === true ? true : false,
    wantRender: organizerData.wantRender === true ? true : false,
    organizerTypes: organizerData.organizerTypes || {
      isEventOrganizer: true,
      isVenue: false,
      isTeacher: false,
      isMaestro: false,
      isDJ: false,
      isOrchestra: false
    },
  };
}

/**
 * Formats an organizer object for update
 * 
 * @param {Object} organizerData - Organizer data
 * @param {string} appId - Application ID
 * @returns {Object} Formatted organizer data
 */
export function formatOrganizerForUpdate(organizerData, appId) {
  // Make sure we have the appId in the updatedOrganizer and ensure boolean fields are properly set
  const formattedOrganizer = {
    ...organizerData,
    appId: organizerData.appId || appId,
    // Ensure both name fields are set consistently
    name: organizerData.name,
    fullName: organizerData.name,
    shortName: organizerData.shortName || organizerData.name,
    // Explicitly convert boolean fields with ternary to ensure true/false values
    wantRender: organizerData.wantRender === true ? true : false,
    isActive: organizerData.isActive === true ? true : false,
    isEnabled: organizerData.isEnabled === true ? true : false
  };
  
  // Remove isApproved as it's no longer used
  delete formattedOrganizer.isApproved;
  
  return formattedOrganizer;
}

/**
 * Formats the address for an organizer
 * 
 * @param {Object} organizerData - Organizer data
 * @returns {string} Formatted address
 */
export function formatOrganizerAddress(organizerData) {
  const address = organizerData.address || {};
  const parts = [];
  
  if (address.street) parts.push(address.street);
  
  const cityState = [];
  if (address.city) cityState.push(address.city);
  if (address.state) cityState.push(address.state);
  if (cityState.length > 0) parts.push(cityState.join(', '));
  
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);
  
  return parts.join('\n');
}

/**
 * Validates the shortName format for an organizer
 * 
 * @param {string} shortName - Organizer short name
 * @returns {boolean} True if valid
 */
export function validateShortName(shortName) {
  // Must be <= 10 chars, no spaces, uppercase only, and only allows !?-_
  const regex = /^[A-Z0-9!?\-_]{1,10}$/;
  return regex.test(shortName);
}

/**
 * Formats the shortName to match requirements
 * 
 * @param {string} shortName - Original short name
 * @returns {string} Formatted short name
 */
export function formatShortName(shortName) {
  // Remove spaces, convert to uppercase, limit to 10 chars
  return shortName.replace(/\s+/g, '').toUpperCase().substring(0, 10);
}