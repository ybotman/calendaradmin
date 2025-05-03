// entity-resolution.js
// Entity resolution functions for BTC import

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3010/api';
const APP_ID = process.env.APP_ID || '1';

// Default Boston masteredCity information for fallback use
const BOSTON_DEFAULTS = {
  masteredCityId: "64f26a9f75bfc0db12ed7a1e",
  masteredCityName: "Boston",
  masteredDivisionId: "64f26a9f75bfc0db12ed7a15",
  masteredDivisionName: "Massachusetts",
  masteredRegionId: "64f26a9f75bfc0db12ed7a12",
  masteredRegionName: "New England",
  coordinates: [-71.0589, 42.3601] // Boston coordinates [longitude, latitude]
};

// Cache for entity lookups to minimize API calls
const cache = {
  venues: new Map(), // name -> venueId
  organizers: new Map(), // name -> organizerId
  categories: new Map(), // name -> categoryId
  unmatched: {
    venues: new Set(),
    organizers: new Set(),
    categories: new Set()
  }
};

/**
 * Maps a category name from BTC to TT
 * Improved version with enhanced matching patterns and robustness
 */
export function mapToTTCategory(sourceName) {
  if (!sourceName) return null;

  // --- Add this direct 1:1 mapping block ---
  const directMapping = {
    'Canceled': 'Virtual',
    'Class': 'Class',
    'Drop-in Class': 'Class',
    'Progressive Class': 'Class',
    'Forum/RoundTable/Labs': 'Class',
    'WorkShop': 'Workshop',
    'Festivals': 'Festival',
    'Milonga': 'Milonga',
    'Practica': 'Practica',
    'Trips-Hosted': 'Trip',
    'Party/Gathering': 'Festival',
    'Live Orchestra': 'Milonga',
    'Other': 'Virtual',
    'First Timer Friendly': 'Class'
  };
  if (directMapping[sourceName]) {
    return directMapping[sourceName];
  }

  // Legacy pattern matching removed; rely on directMapping and default

  // Default to "Other" if no mapping found
  return "Other";
}

/**
 * Resolves a venue from BTC to TangoTiempo
 * @param {Object} btcVenue - Venue object from BTC API
 * @returns {Promise<string|null>} - TT venueId or null if not found
 */
export async function resolveVenue(btcVenue) {
  if (!btcVenue || !btcVenue.venue) {
    console.warn('Empty venue object received');
    return null;
  }

  const venueName = btcVenue.venue;
  if (cache.venues.has(venueName)) {
    return cache.venues.get(venueName);
  }

  try {
    const encodedName = encodeURIComponent(venueName);
    const response = await axios.get(`${API_BASE_URL}/venues?appId=${APP_ID}&name=${encodedName}`);
    if (response.data?.data?.length) {
      const id = response.data.data[0]._id;
      cache.venues.set(venueName, id);
      return id;
    }
  } catch (error) {
    console.warn(`Venue lookup failed for "${venueName}": ${error.message}`);
  }

  // Perform a lookup if fallbackId or _id is not provided
  if (!fallbackId || !btcVenue._id) {
    try {
      const encodedName = encodeURIComponent(venueName);
      const response = await axios.get(`${API_BASE_URL}/venues?appId=${APP_ID}&name=${encodedName}`);
      if (response.data?.data?.length) {
        const id = response.data.data[0]._id;
        cache.venues.set(venueName, id);
        return id;
      }
    } catch (error) {
      console.warn(`Venue lookup failed for "${venueName}": ${error.message}`);
    }
  }

  const fallbackId = 'UNKNOWN';
  cache.venues.set(venueName, fallbackId);
  cache.unmatched.venues.add(venueName);
  return fallbackId;
}

/**
 * Resolves an organizer from BTC to TangoTiempo
 * @param {Object} btcOrganizer - Organizer object from BTC API
 * @returns {Promise<{id: string, name: string}|null>} - TT organizer info or null if not found
 */
export async function resolveOrganizer(btcOrganizer) {
  if (!btcOrganizer || !btcOrganizer.organizer) {
    console.warn('Empty organizer object received');
    return null;
  }

  const organizerName = btcOrganizer.organizer;
  if (cache.organizers.has(organizerName)) {
    return cache.organizers.get(organizerName);
  }

  try {
    const encodedName = encodeURIComponent(organizerName);
    const response = await axios.get(`${API_BASE_URL}/organizers?appId=${APP_ID}&name=${encodedName}`);
    if (response.data?.organizers?.length) {
      const info = { id: response.data.organizers[0]._id, name: organizerName };
      cache.organizers.set(organizerName, info);
      return info;
    }
  } catch (error) {
    console.warn(`Organizer lookup failed for "${organizerName}": ${error.message}`);
  }

  const fallback = { id: 'UNKNOWN_ORGANIZER_ID', name: organizerName };
  cache.organizers.set(organizerName, fallback);
  cache.unmatched.organizers.add(organizerName);
  return fallback;
}

/**
 * Resolves a category from BTC to TangoTiempo with enhanced fallback strategies
 * @param {Object} btcCategory - Category object from BTC API
 * @returns {Promise<{id: string, name: string}|null>} - TT category info or null if not found
 */
export async function resolveCategory(btcCategory) {
  const name = btcCategory?.name || '';
  const mapped = mapToTTCategory(name);
  const result = { id: mapped, name: mapped };
  cache.categories.set(name, result);
  return result;
}

/**
 * Log organizer resolution details to a file for analysis
 * @param {Object} logEntry - The log entry to save
 */
function logOrganizerResolution(logEntry) {
  try {
    // Get the base directory
    const baseDir = process.env.OUTPUT_DIR || path.join(__dirname, 'import-results');
    
    // Create organizer-resolution directory if it doesn't exist
    const organizerLogsDir = path.join(baseDir, 'organizer-resolution');
    if (!fs.existsSync(organizerLogsDir)) {
      fs.mkdirSync(organizerLogsDir, { recursive: true });
    }
    
    // Create a timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const organizerName = logEntry.source?.name || 'unknown';
    const success = logEntry.success ? 'success' : 'failure';
    const filename = `${timestamp}-${success}-${organizerName.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    
    // Write the log entry to a file
    fs.writeFileSync(
      path.join(organizerLogsDir, filename),
      JSON.stringify(logEntry, null, 2)
    );
    
    // Also append to a summary file
    const summaryFile = path.join(organizerLogsDir, 'resolution-summary.log');
    const summaryLine = `${logEntry.timestamp} | ${organizerName} | ${success} | Methods: ${logEntry.attempts.map(a => a.method).join(', ')}\n`;
    
    fs.appendFileSync(summaryFile, summaryLine);
  } catch (error) {
    console.error('Error logging organizer resolution:', error);
  }
}

/**
 * Loads all categories from TT API and BTC API to populate the cache with proper mappings
 * @returns {Promise<void>}
 */
export async function loadAllCategories() {
  try {
    // Step 1: Load TT categories
    const response = await axios.get(`${API_BASE_URL}/categories?appId=${APP_ID}&limit=500`);
    
    if (response.data && response.data.data) {
      const ttCategories = response.data.data;
      console.log(`Loaded ${ttCategories.length} categories from TT API`);
      
      // Store category IDs for essential categories
      const essentialCategoryIds = {
        Class: null,
        Milonga: null,
        Practica: null,
        Other: null,
        Performance: null,
        Festival: null
      };
      
      // Step 2: Load BTC categories to build direct mappings
      let btcCategories = [];
      try {
        const btcResponse = await axios.get('https://bostontangocalendar.com/wp-json/tribe/events/v1/categories/');
        if (btcResponse.data && btcResponse.data.categories) {
          btcCategories = btcResponse.data.categories;
          console.log(`Loaded ${btcCategories.length} categories from BTC API`);
        }
      } catch (btcError) {
        console.warn(`Failed to load BTC categories: ${btcError.message}`);
        // Continue with fallback mappings even if BTC API fails
      }
      
      // Step 3: Build mapping of essential categories first
      for (const category of ttCategories) {
        const ttName = category.categoryName;
        
        // Store IDs for essential categories
        if (Object.keys(essentialCategoryIds).includes(ttName)) {
          essentialCategoryIds[ttName] = category._id;
          console.log(`Found essential category "${ttName}" with ID: ${category._id}`);
        }
      }
      
      // Step 4: Create direct mappings from BTC to TT categories
      // Define matching rules - priority order matters!
      const categoryMatchRules = [
        // Direct word matches
        { btcPattern: /class|lesson|workshop/i, ttCategory: "Class" },
        { btcPattern: /milonga|dance|ball|salon/i, ttCategory: "Milonga" },
        { btcPattern: /practica|practice|practilonga/i, ttCategory: "Practica" },
        { btcPattern: /performance|show|exhibition|concert/i, ttCategory: "Performance" },
        { btcPattern: /festival|encuentro|marathon/i, ttCategory: "Festival" }
      ];
      
      // Process each BTC category and map to TT category
      for (const btcCategory of btcCategories) {
        const btcName = btcCategory.name;
        const btcSlug = btcCategory.slug;
        
        // Try to find a match based on our rules
        let matched = false;
        
        for (const rule of categoryMatchRules) {
          if (rule.btcPattern.test(btcName) || rule.btcPattern.test(btcSlug)) {
            const ttCategory = rule.ttCategory;
            
            if (essentialCategoryIds[ttCategory]) {
              // We found a mapping between BTC category and TT category
              cache.categories.set(btcName, {
                id: essentialCategoryIds[ttCategory],
                name: ttCategory,
                source: 'direct-mapping'
              });
              
              console.log(`Mapped BTC category "${btcName}" to TT category "${ttCategory}"`);
              matched = true;
              break;
            }
          }
        }
        
        // If no match found, map to "Other" if available, otherwise first essential category
        if (!matched) {
          const fallbackId = essentialCategoryIds.Other || 
                           essentialCategoryIds.Class || 
                           essentialCategoryIds.Milonga ||
                           essentialCategoryIds.Practica;
          
          if (fallbackId) {
            const fallbackCategory = Object.keys(essentialCategoryIds).find(
              key => essentialCategoryIds[key] === fallbackId
            );
            
            cache.categories.set(btcName, {
              id: fallbackId,
              name: fallbackCategory,
              source: 'fallback-mapping'
            });
            
            console.log(`Mapped BTC category "${btcName}" to fallback category "${fallbackCategory}"`);
          }
        }
      }
      
      // Step 5: Add direct mappings for common variations not in BTC API
      // Class variations
      if (essentialCategoryIds.Class) {
        const classVariations = [
          "Drop-in Class", "Progressive Class", "Workshop", "DayWorkshop", 
          "First Timer Friendly", "Beginner Class", "Advanced Class",
          "Technique", "Seminar", "Training", "Intensive"
        ];
        
        for (const variation of classVariations) {
          cache.categories.set(variation, {
            id: essentialCategoryIds.Class,
            name: "Class",
            source: 'variation-mapping'
          });
        }
      }
      
      // Milonga variations
      if (essentialCategoryIds.Milonga) {
        const milongaVariations = [
          "Dance", "Ball", "Salon", "Social Dance", "Fiesta", 
          "Milonga Night", "Evening Milonga", "Baile", "Soiree"
        ];
        
        for (const variation of milongaVariations) {
          cache.categories.set(variation, {
            id: essentialCategoryIds.Milonga,
            name: "Milonga",
            source: 'variation-mapping'
          });
        }
      }
      
      // Practica variations
      if (essentialCategoryIds.Practica) {
        const practicaVariations = [
          "Practice", "Guided Practice", "Open Practice", 
          "Supervised Practice", "Practilonga"
        ];
        
        for (const variation of practicaVariations) {
          cache.categories.set(variation, {
            id: essentialCategoryIds.Practica,
            name: "Practica",
            source: 'variation-mapping'
          });
        }
      }
      
      // Step 6: Add fallback categories for robustness
      if (essentialCategoryIds.Class) {
        cache.categories.set("default_class_id", {
          id: essentialCategoryIds.Class,
          name: "Class",
          source: 'default-fallback' 
        });
      }
      
      if (essentialCategoryIds.Other) {
        cache.categories.set("default_other_id", {
          id: essentialCategoryIds.Other,
          name: "Other",
          source: 'default-fallback'
        });
      }
      
      console.log(`Cached ${cache.categories.size} category mappings`);
    }
  } catch (error) {
    console.error('Error loading categories:', error.message);
  }
}

/**
 * Retrieves venue geographic information for an event
 * @param {string} venueId - TT venueId
 * @returns {Promise<Object|null>} - Geographic hierarchy info or null
 */
export async function getVenueGeography(venueId) {
  // For testing purposes, return mock geography if it's a mock venue
  if (venueId && venueId.startsWith('mock-venue-')) {
    return {
      venueGeolocation: {
        type: "Point",
        coordinates: [-71.0589, 42.3601]
      },
      masteredCityId: "64f26a9f75bfc0db12ed7a1e", // Using real ObjectID
      masteredCityName: "Boston",
      masteredDivisionId: "64f26a9f75bfc0db12ed7a15", // Using real ObjectID
      masteredDivisionName: "Massachusetts",
      masteredRegionId: "64f26a9f75bfc0db12ed7a12", // Using real ObjectID
      masteredRegionName: "New England",
      masteredCityGeolocation: {
        type: "Point",
        coordinates: [-71.0589, 42.3601]
      },
      isValidVenueGeolocation: true // Mock venues are always valid
    };
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/venues/${venueId}?appId=${APP_ID}`);
    
    if (response.data) {
      const venue = response.data;
      
      // Ensure proper GeoJSON format for venue geolocation
      let venueGeolocation;
      if (venue.geolocation) {
        // If we have geolocation data, ensure it's in proper GeoJSON format
        if (venue.geolocation.type === "Point" && Array.isArray(venue.geolocation.coordinates)) {
          // Already in correct format, use as is
          venueGeolocation = venue.geolocation;
        } else if (Array.isArray(venue.geolocation)) {
          // Convert array to GeoJSON Point
          venueGeolocation = {
            type: "Point",
            coordinates: venue.geolocation
          };
        } else {
          // Default coordinates for Boston, MA if not in proper format
          console.warn(`Invalid geolocation format for venue ${venueId}, using default coordinates`);
          venueGeolocation = {
            type: "Point",
            coordinates: [-71.0589, 42.3601] // Boston, MA
          };
        }
      } else {
        // No geolocation data, use default
        console.warn(`No geolocation data for venue ${venueId}, using default coordinates`);
        venueGeolocation = {
          type: "Point",
          coordinates: [-71.0589, 42.3601] // Boston, MA
        };
      }
      
      // Create full GeoJSON Point object for city geolocation with explicit coordinates
      // IMPORTANT: This is needed to satisfy MongoDB validation
      let cityGeolocation;
      
      // Try to get coordinates from the venue's city if available
      if (venue.masteredCityId?.geolocation?.coordinates && 
          Array.isArray(venue.masteredCityId.geolocation.coordinates) &&
          venue.masteredCityId.geolocation.coordinates.length === 2) {
        // Use the actual city coordinates if available
        cityGeolocation = {
          type: "Point",
          coordinates: venue.masteredCityId.geolocation.coordinates
        };
      } else if (venue.latitude && venue.longitude) {
        // Fallback to venue coordinates if city coordinates not available
        cityGeolocation = {
          type: "Point",
          coordinates: [parseFloat(venue.longitude), parseFloat(venue.latitude)]
        };
      } else {
        // Default to Boston coordinates as last resort
        cityGeolocation = {
          type: "Point",
          coordinates: BOSTON_DEFAULTS.coordinates // Explicit coordinates for Boston
        };
        
        // If we're using Boston fallback, also set the masteredCityId if not already set
        if (!venue.masteredCityId) {
          console.log(`Setting default Boston masteredCityId for venue ${venueId}`);
          try {
            await axios.put(`${API_BASE_URL}/venues/${venueId}?appId=${APP_ID}`, {
              ...venue,
              masteredCityId: BOSTON_DEFAULTS.masteredCityId,
              appId: APP_ID
            });
          } catch (updateError) {
            console.error(`Failed to update venue ${venueId} with default masteredCityId: ${updateError.message}`);
          }
        }
      }
      
      // Determine if the venue's geolocation is valid
      let isValidVenueGeolocation = false;
      
      // First check if venue already has a validation status
      if (venue.hasOwnProperty('isValidVenueGeolocation')) {
        isValidVenueGeolocation = Boolean(venue.isValidVenueGeolocation);
      } 
      // Otherwise validate it if we have coordinates
      else if (venue.latitude && venue.longitude) {
        try {
          // Try to find the nearest city for validation
          const cityResponse = await axios.get(`${API_BASE_URL}/venues/nearest-city`, {
            params: {
              appId: APP_ID,
              longitude: venue.longitude,
              latitude: venue.latitude,
              limit: 1
            }
          });
          
          // Consider valid if within 5km of a city
          const MAX_DISTANCE_KM = 5;
          if (cityResponse.data && 
              cityResponse.data.length > 0 && 
              cityResponse.data[0].distanceInKm <= MAX_DISTANCE_KM) {
            isValidVenueGeolocation = true;
            
            // If we're here, we've confirmed valid geolocation - update the venue
            try {
              await axios.put(`${API_BASE_URL}/venues/${venueId}?appId=${APP_ID}`, {
                ...venue,
                isValidVenueGeolocation: true,
                appId: APP_ID
              });
              console.log(`Updated venue ${venueId} with valid geolocation flag`);
            } catch (updateError) {
              console.error(`Failed to update venue ${venueId} validation status:`, updateError.message);
            }
          }
        } catch (cityError) {
          console.error(`Error validating venue ${venueId} location:`, cityError.message);
        }
      }
      
      // If venue lacks masteredCity information, use Boston defaults
      const needsBostonDefaults = !venue.masteredCityId && !venue.masteredDivisionId;
      
      return {
        venueGeolocation: venueGeolocation,
        masteredCityId: venue.masteredCityId?._id || venue.masteredCityId || BOSTON_DEFAULTS.masteredCityId,
        masteredCityName: venue.masteredCityId?.cityName || venue.city || BOSTON_DEFAULTS.masteredCityName,
        masteredDivisionId: venue.masteredDivisionId?._id || venue.masteredDivisionId || BOSTON_DEFAULTS.masteredDivisionId,
        masteredDivisionName: venue.masteredDivisionId?.divisionName || venue.state || BOSTON_DEFAULTS.masteredDivisionName,
        masteredRegionId: venue.masteredRegionId?._id || venue.masteredRegionId || BOSTON_DEFAULTS.masteredRegionId,
        masteredRegionName: venue.masteredRegionId?.regionName || (needsBostonDefaults ? BOSTON_DEFAULTS.masteredRegionName : "Unknown Region"),
        masteredCityGeolocation: cityGeolocation,
        isValidVenueGeolocation: isValidVenueGeolocation || needsBostonDefaults // If using Boston defaults, consider valid
      };
    }
    return null;
  } catch (error) {
    console.error(`Error getting venue geography for ${venueId}:`, error.message);
    return null;
  }
}

/**
 * Generates a report of unmatched entities
 * @returns {Object} - Report of unmatched entities
 */
export function getUnmatchedReport() {
  return {
    venues: Array.from(cache.unmatched.venues),
    organizers: Array.from(cache.unmatched.organizers),
    categories: Array.from(cache.unmatched.categories),
    stats: {
      totalVenues: cache.venues.size,
      totalOrganizers: cache.organizers.size,
      totalCategories: cache.categories.size,
      unmatchedVenues: cache.unmatched.venues.size,
      unmatchedOrganizers: cache.unmatched.organizers.size,
      unmatchedCategories: cache.unmatched.categories.size
    }
  };
} 

const entityResolvers = {
  resolveVenue,
  resolveOrganizer,
  resolveCategory,
  getVenueGeography,
  getUnmatchedReport,
  loadAllCategories,
  mapToTTCategory
};

export default entityResolvers;