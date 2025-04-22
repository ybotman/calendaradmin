/**
 * Utility functions for transforming user data
 */

/**
 * Formats a new user object for creation
 * 
 * @param {Object} userData - Raw user data from form
 * @param {string} appId - Application ID
 * @returns {Object} Formatted user data
 */
export function formatUserForCreate(userData, appId) {
  return {
    email: userData.email,
    password: userData.password || '',
    firstName: userData.firstName,
    lastName: userData.lastName,
    appId: appId,
    active: userData.active
  };
}

/**
 * Formats a user object for update
 * 
 * @param {Object} userData - User data to update
 * @param {string} appId - Application ID
 * @returns {Object} Formatted user data for update
 */
export function formatUserForUpdate(userData, appId) {
  return {
    firebaseUserId: userData.firebaseUserId,
    appId: userData.appId || appId,
    active: userData.active,
    localUserInfo: userData.localUserInfo,
    regionalOrganizerInfo: userData.regionalOrganizerInfo,
    localAdminInfo: userData.localAdminInfo
  };
}

/**
 * Formats organizer data for creation when creating a user
 * 
 * @param {Object} userData - User data
 * @param {string} userId - Firebase user ID
 * @param {string} userLoginId - User login ID
 * @param {string} appId - Application ID
 * @returns {Object} Formatted organizer data
 */
export function formatOrganizerForUserCreate(userData, userId, userLoginId, appId) {
  return {
    firebaseUserId: userId,
    linkedUserLogin: userLoginId,
    appId: appId,
    fullName: `${userData.firstName} ${userData.lastName}`.trim(),
    shortName: userData.firstName,
    organizerRegion: "66c4d99042ec462ea22484bd", // US region default
    isActive: true,
    isEnabled: true,
    wantRender: true,
    organizerTypes: {
      isEventOrganizer: true,
      isVenue: false,
      isTeacher: false,
      isMaestro: false,
      isDJ: false,
      isOrchestra: false
    }
  };
}

/**
 * Determines if a user has an organizer profile
 * 
 * @param {Object} user - User data
 * @returns {boolean} True if user has an organizer profile
 */
export function hasOrganizerProfile(user) {
  return !!(
    user.regionalOrganizerInfo && 
    user.regionalOrganizerInfo.organizerId &&
    user.regionalOrganizerInfo.organizerId !== null &&
    user.regionalOrganizerInfo.organizerId !== undefined
  );
}

/**
 * Determines if a user is an admin
 * 
 * @param {Object} user - User data
 * @returns {boolean} True if user is an admin
 */
export function isAdmin(user) {
  const roleCodes = user.roleNameCodes?.split(', ') || [];
  return roleCodes.includes('SA') || roleCodes.includes('RA');
}

/**
 * Gets the full display name for a user
 * 
 * @param {Object} user - User data
 * @returns {string} User's display name
 */
export function getUserDisplayName(user) {
  return user.firebaseUserInfo?.displayName || 
    user.fullName || 
    `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || 
    user.shortName || 
    user.loginId || 
    '';
}

/**
 * Gets the email for a user
 * 
 * @param {Object} user - User data
 * @returns {string} User's email
 */
export function getUserEmail(user) {
  return user.firebaseUserInfo?.email || 
    user.publicEmail || 
    user.loginId ? `${user.loginId}@example.com` : 
    '';
}