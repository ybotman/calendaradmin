import { entityCache } from './cache.js';

/**
 * Generates a report of unmatched entities from the cache
 * @returns {Object} - Report with lists and stats
 */
export function getUnmatchedReport() {
  return {
    venues: Array.from(entityCache.unmatched.venues),
    organizers: Array.from(entityCache.unmatched.organizers),
    categories: Array.from(entityCache.unmatched.categories),
    stats: {
      totalVenues: entityCache.venues.size,
      totalOrganizers: entityCache.organizers.size,
      totalCategories: entityCache.categories.size,
      unmatchedVenues: entityCache.unmatched.venues.size,
      unmatchedOrganizers: entityCache.unmatched.organizers.size,
      unmatchedCategories: entityCache.unmatched.categories.size
    }
  };
}