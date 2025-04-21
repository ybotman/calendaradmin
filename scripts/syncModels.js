/**
 * Model Sync Script
 * 
 * This script validates the model connections between calops and calendar-be.
 * It tests importing models from calendar-be and ensures they can be properly accessed.
 */

import connectToDatabase from '../src/lib/mongodb.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to calendar-be models
const calendarBeModelsPath = path.resolve(__dirname, '../../calendar-be/models');

// Models to check
const modelsList = [
  { name: 'UserLogins', file: 'userLogins.js' },
  { name: 'Roles', file: 'roles.js' },
  { name: 'MasteredRegion', file: 'masteredRegions.js' },
  { name: 'MasteredCountry', file: 'masteredCountries.js' },
  { name: 'MasteredDivision', file: 'masteredDivisions.js' },
  { name: 'MasteredCity', file: 'masteredCities.js' },
  { name: 'Organizers', file: 'organizers.js' },
];

async function syncModels() {
  console.log('Calendar Admin - Model Sync Tool');
  console.log('================================\n');
  
  console.log(`Checking models in: ${calendarBeModelsPath}\n`);
  
  // Check if calendar-be models directory exists
  if (!fs.existsSync(calendarBeModelsPath)) {
    console.error(`Error: calendar-be models directory not found at ${calendarBeModelsPath}`);
    process.exit(1);
  }
  
  // Check each model
  for (const model of modelsList) {
    const modelPath = path.join(calendarBeModelsPath, model.file);
    console.log(`Checking ${model.name} (${model.file})...`);
    
    if (!fs.existsSync(modelPath)) {
      console.error(`  [ERROR] Model file not found: ${modelPath}`);
      continue;
    }
    
    try {
      // Attempt to import the model
      const importedModel = await import(modelPath);
      console.log(`  [SUCCESS] Model imported successfully`);
    } catch (error) {
      console.error(`  [ERROR] Failed to import model: ${error.message}`);
    }
  }
  
  console.log('\nTesting database connection...');
  
  try {
    // Test the database connection
    const mongoose = await connectToDatabase();
    console.log('  [SUCCESS] Connected to MongoDB');
    
    // Check if models can be accessed via Mongoose
    const modelNames = await mongoose.connection.db.listCollections().toArray();
    console.log(`  Found ${modelNames.length} collections in database`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('  Database connection closed');
  } catch (error) {
    console.error(`  [ERROR] Database connection failed: ${error.message}`);
  }
  
  console.log('\nModel synchronization check complete');
}

// Run the sync check
syncModels().catch(console.error);