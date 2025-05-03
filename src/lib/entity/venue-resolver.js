import axios from 'axios';
import { entityCache } from './cache.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3010/api';
const APP_ID = process.env.APP_ID || '1';

/**
 * Resolves a BTC venue to a TT venueId, with cache and fallbacks
 * @param {Object} btcVenue
 * @returns {Promise<string>}
 */
export async function resolveVenue(btcVenue) {
  // ...existing resolveVenue logic from entity-resolution.js, using entityCache...
}

/**
 * Fetch venue geography information for a given TT venueId
 * @param {string} venueId
 * @returns {Promise<Object|null>}
 */
export async function getVenueGeography(venueId) {
  // ...existing getVenueGeography logic from entity-resolution.js...
}