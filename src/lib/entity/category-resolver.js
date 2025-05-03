import axios from 'axios';
import { entityCache } from './cache.js';

// Config
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3010/api';
const APP_ID = process.env.APP_ID || '1';

// Direct mapping helper
export function mapToTTCategory(sourceName) {
  // ...existing mapping logic from entity-resolution...
}

// Load all categories into cache
export async function loadAllCategories() {
  // ...existing code that fetches all TT and BTC categories and populates entityCache.categories...
}

// Resolve a single BTC category
export async function resolveCategory(btcCategory) {
  // ...existing resolveCategory logic, using entityCache and mapToTTCategory...
}
