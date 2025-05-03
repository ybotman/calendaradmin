import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { entityCache } from './cache.js';

// Config
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3010/api';
const APP_ID = process.env.APP_ID || '1';

/**
 * Resolves a BTC organizer to a TT organizer entity
 * @param {Object} btcOrganizer - Organizer object from BTC API
 * @returns {Promise<{id:string,name:string}>}
 */
export async function resolveOrganizer(btcOrganizer) {
  // ...existing resolveOrganizer logic from entity-resolution.js...
}

/**
 * Log organizer resolution details for analysis
 * @param {Object} logEntry
 */
export function logOrganizerResolution(logEntry) {
  // ...existing logOrganizerResolution logic from entity-resolution.js...
}
