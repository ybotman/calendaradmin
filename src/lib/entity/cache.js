// src/lib/entity/cache.js

// Centralized cache for entity lookups
export const entityCache = {
  venues: new Map(),      // name -> venueId
  organizers: new Map(),  // name -> organizerInfo
  categories: new Map(),  // name -> categoryInfo
  unmatched: {
    venues: new Set(),
    organizers: new Set(),
    categories: new Set()
  }
};

// Reset cache for testing or reinitialization
export function resetEntityCache() {
  entityCache.venues.clear();
  entityCache.organizers.clear();
  entityCache.categories.clear();
  entityCache.unmatched.venues.clear();
  entityCache.unmatched.organizers.clear();
  entityCache.unmatched.categories.clear();
}