import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// Direct model definitions for geo hierarchy (temporary until backend API is available)
let modelsCache = {};

// Helper functions for getting models
async function getMasteredCountryModel() {
  if (modelsCache.MasteredCountry) {
    return modelsCache.MasteredCountry;
  }
  
  const Schema = mongoose.Schema;
  const masteredCountrySchema = new Schema({
    appId: { type: String, required: true, default: "1" },
    countryName: { type: String, required: true },
    countryCode: { type: String, required: true },
    continent: { type: String, required: true },
    active: { type: Boolean, default: true },
  });
  
  const model = mongoose.models.masteredCountry || mongoose.model("masteredCountry", masteredCountrySchema);
  modelsCache.MasteredCountry = model;
  return model;
}

async function getMasteredRegionModel() {
  if (modelsCache.MasteredRegion) {
    return modelsCache.MasteredRegion;
  }
  
  const Schema = mongoose.Schema;
  const masteredRegionSchema = new Schema({
    appId: { type: String, required: true, default: "1" },
    regionName: { type: String, required: true },
    regionCode: { type: String, required: true },
    active: { type: Boolean, default: true },
    masteredCountryId: {
      type: Schema.Types.ObjectId,
      ref: "masteredCountry",
      required: true,
    },
  });
  
  const model = mongoose.models.masteredRegion || mongoose.model("masteredRegion", masteredRegionSchema);
  modelsCache.MasteredRegion = model;
  return model;
}

async function getMasteredDivisionModel() {
  if (modelsCache.MasteredDivision) {
    return modelsCache.MasteredDivision;
  }
  
  const Schema = mongoose.Schema;
  const masteredDivisionSchema = new Schema({
    appId: { type: String, required: true, default: "1" },
    divisionName: { type: String, required: true },
    divisionCode: { type: String, required: true },
    active: { type: Boolean, default: true },
    masteredRegionId: {
      type: Schema.Types.ObjectId,
      ref: "masteredRegion",
      required: true,
    },
    states: { type: [String], required: true },
  });
  
  const model = mongoose.models.masteredDivision || mongoose.model("masteredDivision", masteredDivisionSchema);
  modelsCache.MasteredDivision = model;
  return model;
}

async function getMasteredCityModel() {
  if (modelsCache.MasteredCity) {
    return modelsCache.MasteredCity;
  }
  
  const Schema = mongoose.Schema;
  const masteredCitySchema = new Schema({
    appId: { type: String, required: true, default: "1" },
    cityName: { type: String, required: true },
    cityCode: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (value) {
            return value.length === 2;
          },
          message: "Coordinates must be [longitude, latitude]",
        },
      },
    },
    isActive: { type: Boolean, default: true },
    masteredDivisionId: {
      type: Schema.Types.ObjectId,
      ref: "masteredDivision",
      required: true,
    },
  });
  
  // Create 2dsphere index for geospatial queries
  masteredCitySchema.index({ location: "2dsphere" });
  
  const model = mongoose.models.masteredCity || mongoose.model("masteredCity", masteredCitySchema);
  modelsCache.MasteredCity = model;
  return model;
}

/**
 * GET handler for geo-hierarchy API endpoint
 * NOTE: This uses direct database access as a temporary solution 
 * until proper backend API endpoint is available
 * 
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} JSON response with geo hierarchy data
 */
export async function GET(request) {
  console.log('Geo Hierarchy API endpoint called');
  
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Log the request for debugging
    console.log('Request URL:', url.toString());
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const appId = searchParams.get('appId');
    const type = searchParams.get('type') || 'all';
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    // Connect to the database
    await connectToDatabase();
    console.log('Database connection established');
    
    // Get models
    console.log('Initializing models for geo-hierarchy API...');
    let MasteredCountry, MasteredRegion, MasteredDivision, MasteredCity;
    
    try {
      // Initialize models with direct schema definitions
      MasteredCountry = await getMasteredCountryModel();
      MasteredRegion = await getMasteredRegionModel();
      MasteredDivision = await getMasteredDivisionModel();
      MasteredCity = await getMasteredCityModel();
      
      console.log('Successfully initialized all geo hierarchy models');
    } catch (e) {
      console.error('Error initializing geo hierarchy models:', e);
      return NextResponse.json({ 
        error: 'Failed to initialize geo hierarchy models', 
        details: e.message,
        stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
      }, { status: 500 });
    }
    
    // Simplify query to just get all items with the given appId
    const query = { appId };
    console.log('Using query:', query, 'for type:', type);
    
    let result = {};
    
    // Fetch geo hierarchy items based on the requested type
    try {
      switch (type) {
        case 'country':
          console.log('Fetching countries with query:', query);
          result = await MasteredCountry.find(query).sort({ countryName: 1 });
          console.log(`Found ${result.length} countries`);
          break;
          
        case 'region':
          console.log('Fetching regions with query:', query);
          result = await MasteredRegion.find(query)
            .populate('masteredCountryId')
            .sort({ regionName: 1 });
          console.log(`Found ${result.length} regions`);
          break;
          
        case 'division':
          console.log('Fetching divisions with query:', query);
          result = await MasteredDivision.find(query)
            .populate({
              path: 'masteredRegionId',
              populate: { path: 'masteredCountryId' }
            })
            .sort({ divisionName: 1 });
          console.log(`Found ${result.length} divisions`);
          break;
          
        case 'city':
          console.log('Fetching cities with query:', query);
          result = await MasteredCity.find(query)
            .populate({
              path: 'masteredDivisionId',
              populate: {
                path: 'masteredRegionId',
                populate: { path: 'masteredCountryId' }
              }
            })
            .sort({ cityName: 1 });
          console.log(`Found ${result.length} cities`);
          
          // Transform the city data to include latitude and longitude directly
          result = result.map(city => {
            const cityObj = city.toObject ? city.toObject() : city;
            return {
              ...cityObj,
              latitude: city.location?.coordinates[1],
              longitude: city.location?.coordinates[0],
            };
          });
          break;
          
        case 'all':
        default:
          console.log('Fetching all geo hierarchy types with query:', query);
          
          try {
            console.log('Fetching countries...');
            const countries = await MasteredCountry.find(query).sort({ countryName: 1 });
            console.log(`Found ${countries.length} countries`);
            
            console.log('Fetching regions...');
            const regions = await MasteredRegion.find(query)
              .populate('masteredCountryId')
              .sort({ regionName: 1 });
            console.log(`Found ${regions.length} regions`);
            
            console.log('Fetching divisions...');
            const divisions = await MasteredDivision.find(query)
              .populate({
                path: 'masteredRegionId',
                populate: { path: 'masteredCountryId' }
              })
              .sort({ divisionName: 1 });
            console.log(`Found ${divisions.length} divisions`);
            
            console.log('Fetching cities...');
            const citiesData = await MasteredCity.find(query)
              .populate({
                path: 'masteredDivisionId',
                populate: {
                  path: 'masteredRegionId',
                  populate: { path: 'masteredCountryId' }
                }
              })
              .sort({ cityName: 1 });
            console.log(`Found ${citiesData.length} cities`);
            
            // Transform the city data to include latitude and longitude directly
            const cities = citiesData.map(city => {
              try {
                const cityObj = city.toObject ? city.toObject() : city;
                return {
                  ...cityObj,
                  latitude: city.location?.coordinates[1], 
                  longitude: city.location?.coordinates[0],
                };
              } catch (err) {
                console.error('Error processing city:', err, city);
                return city;
              }
            });
            
            result = { countries, regions, divisions, cities };
          } catch (sectionError) {
            console.error('Error fetching specific section:', sectionError);
            throw sectionError;
          }
        break;
      }
    } catch (queryError) {
      console.error('Error in geo hierarchy query execution:', queryError);
      throw queryError;
    }
    
    // Transform the result to match the expected frontend format if needed
    if (type === 'country') {
      return NextResponse.json({ countries: result });
    } else if (type === 'region') {
      return NextResponse.json({ regions: result });
    } else if (type === 'division') {
      return NextResponse.json({ divisions: result });
    } else if (type === 'city') {
      return NextResponse.json({ cities: result });
    } else {
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching geo hierarchy:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch geo hierarchy', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * POST handler for creating geo-hierarchy items
 * Uses direct database access as temp solution until backend API is available
 */
export async function POST(request) {
  try {
    console.log('Starting POST request to create a geo hierarchy item...');
    await connectToDatabase();
    console.log('Database connection established for POST');
    
    // Get models based on geo hierarchy type
    const data = await request.json();
    const { type, ...itemData } = data;
    
    // Validation
    if (!type) {
      return NextResponse.json(
        { error: 'Geo hierarchy type is required' },
        { status: 400 }
      );
    }
    
    if (!itemData.appId) {
      return NextResponse.json(
        { error: 'appId is required' },
        { status: 400 }
      );
    }
    
    console.log(`Creating ${type} with data:`, JSON.stringify(itemData));
    
    let newItem;
    let Model;
    
    // Create geo hierarchy item based on the specified type
    try {
      switch (type) {
        case 'country':
          Model = await getMasteredCountryModel();
          newItem = new Model(itemData);
          break;
        case 'region':
          Model = await getMasteredRegionModel();
          newItem = new Model(itemData);
          break;
        case 'division':
          Model = await getMasteredDivisionModel();
          newItem = new Model(itemData);
          break;
        case 'city':
          Model = await getMasteredCityModel();
          newItem = new Model(itemData);
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid geo hierarchy type. Must be one of: country, region, division, city' },
            { status: 400 }
          );
      }
    } catch (modelError) {
      console.error(`Error loading model for type ${type}:`, modelError);
      return NextResponse.json({ 
        error: `Failed to load model for type ${type}`, 
        details: modelError.message,
        stack: process.env.NODE_ENV === 'development' ? modelError.stack : undefined
      }, { status: 500 });
    }
    
    try {
      await newItem.save();
      console.log(`Successfully created ${type} with id ${newItem._id}`);
    } catch (saveError) {
      console.error(`Error saving ${type}:`, saveError);
      
      // Provide more detailed error messages based on mongoose validation errors
      if (saveError.name === 'ValidationError') {
        const validationErrors = {};
        
        for (const field in saveError.errors) {
          validationErrors[field] = saveError.errors[field].message;
        }
        
        return NextResponse.json({
          error: 'Validation error',
          validationErrors
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to save ${type}`, 
        details: saveError.message,
        stack: process.env.NODE_ENV === 'development' ? saveError.stack : undefined
      }, { status: 500 });
    }
    
    return NextResponse.json(
      { message: `${type} created successfully`, item: newItem },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating geo hierarchy item:', error);
    return NextResponse.json({ 
      error: 'Failed to create geo hierarchy item', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}