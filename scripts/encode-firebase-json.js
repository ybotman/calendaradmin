#!/usr/bin/env node

/**
 * This script encodes a Firebase service account JSON file to base64
 * which can be used for the FIREBASE_JSON environment variable.
 * 
 * Usage:
 *   node encode-firebase-json.js <path-to-service-account-json>
 * 
 * Example:
 *   node encode-firebase-json.js ../../tangotiempo-257ff-firebase-adminsdk-gx3rl-fc9b09dbd6.json
 * 
 * The encoded string will be printed to the console and can be copied directly.
 */

const fs = require('fs');
const path = require('path');

// Get the file path from the command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a path to the Firebase service account JSON file.');
  console.error('Usage: node encode-firebase-json.js <path-to-service-account-json>');
  process.exit(1);
}

// Resolve the absolute path
const absolutePath = path.resolve(process.cwd(), filePath);

try {
  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }
  
  // Read the file
  const fileContent = fs.readFileSync(absolutePath, 'utf8');
  
  try {
    // Validate the JSON by parsing it
    const jsonContent = JSON.parse(fileContent);
    
    // Check for required fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !jsonContent[field]);
    
    if (missingFields.length > 0) {
      console.warn(`Warning: The JSON file is missing some required fields: ${missingFields.join(', ')}`);
      console.warn('This may cause Firebase initialization to fail.');
    }
    
    // Encode to base64
    const base64Content = Buffer.from(fileContent).toString('base64');
    
    // Print the encoded string
    console.log('\nFirebase service account JSON encoded as base64:\n');
    console.log(base64Content);
    console.log('\n');
    
    // Print instructions
    console.log('To use this in your environment, set the following environment variable:');
    console.log('\nFIREBASE_JSON=' + base64Content.substring(0, 20) + '...\n');
    console.log('You can set this in your .env file or directly in your environment.');
    console.log('For development, add it to calendaradmin/.env.local');
    
    // Provide usage example
    console.log('\nIn .env.local:');
    console.log('FIREBASE_JSON=' + base64Content.substring(0, 20) + '...');
    
    // Provide instructions for verifying
    console.log('\nTo verify Firebase initialization, visit:');
    console.log('http://localhost:3011/api/debug/firebase-status');
    
  } catch (error) {
    console.error('Invalid JSON file:', error.message);
    process.exit(1);
  }
} catch (error) {
  console.error(`Error reading file: ${error.message}`);
  process.exit(1);
}