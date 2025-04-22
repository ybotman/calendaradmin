import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import { validateAppId } from '@/utils/api-validation';

// Direct model definitions to avoid importing from calendar-be
let modelsCache = {};

// Venue model
async function getVenueModel() {
  if (modelsCache.Venue) {
    return modelsCache.Venue;
  }
  
  const Schema = mongoose.Schema;
  const venueSchema = new Schema({
    appId: { type: String, required: true, default: "1" },
    name: { type: String, default: "" },
    shortName: { type: String, default: "" },
    address1: { type: String, default: "" },
    address2: { type: String, default: "" },
    address3: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
    phone: { type: String, default: "" },
    comments: { type: String, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
    geolocation: {
      type: { type: String, default: "Point", enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    masteredCityId: { type: Schema.Types.ObjectId, ref: "masteredCity" },
    masteredDivisionId: { type: Schema.Types.ObjectId, ref: "masteredDivision" },
    masteredRegionId: { type: Schema.Types.ObjectId, ref: "masteredRegion" },
    masteredCountryId: { type: Schema.Types.ObjectId, ref: "masteredCountry" },
    isActive: { type: Boolean, default: false },
  });
  
  venueSchema.index({ geolocation: "2dsphere" });
  
  const model = mongoose.models.venue || mongoose.model("venue", venueSchema);
  modelsCache.Venue = model;
  return model;
}

// MasteredCity model needed for geospatial queries
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
  
  masteredCitySchema.index({ location: "2dsphere" });
  
  const model = mongoose.models.masteredCity || mongoose.model("masteredCity", masteredCitySchema);
  modelsCache.MasteredCity = model;
  return model;
}

// Helper function to find nearest city
async function findNearestCity(longitude, latitude) {
  try {
    const MasteredCity = await getMasteredCityModel();
    
    const nearestCity = await MasteredCity.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
        },
      },
      isActive: true,
    }).populate({
      path: 'masteredDivisionId',
      populate: {
        path: 'masteredRegionId',
        populate: { path: 'masteredCountryId' }
      }
    });
    
    return nearestCity;
  } catch (error) {
    console.error('Error finding nearest city:', error);
    return null;
  }
}

export async function GET(request) {
  try {
    console.log('Starting venues API request...');
    await connectToDatabase();
    console.log('Database connection established');
    
    // Get Venue model
    const Venue = await getVenueModel();
    console.log('Successfully initialized Venue model');
    
    console.log('API request received:', request.url);
    const { searchParams } = new URL(request.url);
    
    // Extract and validate appId parameter
    let appId;
    try {
      appId = validateAppId(searchParams);
    } catch (error) {
      console.error(`AppId validation error: ${error.message}`);
      return NextResponse.json({ 
        error: 'Invalid or missing appId parameter', 
        details: error.message 
      }, { status: 400 });
    }
    
    // Parse other query parameters
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const isActiveParam = searchParams.get('isActive');
    const search = searchParams.get('search') || '';
    
    console.log('Query parameters:', { appId, limit, page, isActiveParam, search });
    
    // Build query
    const query = { appId };
    
    // Add isActive filter if provided
    if (isActiveParam !== null && isActiveParam !== undefined) {
      query.isActive = isActiveParam === 'true';
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { address1: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
      ];
    }
    
    console.log('Using query:', JSON.stringify(query));
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    try {
      // Count total matching documents - handle as a separate try-catch
      const total = await Venue.countDocuments(query);
      console.log(`Total matching documents: ${total}`);
      
      // Get venues with pagination
      const venues = await Venue.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit);
      
      console.log(`Found ${venues.length} venues`);
      
      // Only populate if there are venues to avoid errors
      let populatedVenues = [];
      if (venues.length > 0) {
        try {
          // Populate hierarchical data
          populatedVenues = await Venue.populate(venues, {
            path: 'masteredCityId',
            populate: {
              path: 'masteredDivisionId',
              populate: {
                path: 'masteredRegionId',
                populate: { path: 'masteredCountryId' }
              }
            }
          });
        } catch (populateError) {
          console.error('Error populating venue hierarchy:', populateError);
          // If population fails, just return the unpopulated venues
          populatedVenues = venues;
        }
      } else {
        populatedVenues = venues;
      }
      
      return NextResponse.json({
        data: populatedVenues,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (queryError) {
      console.error('Error executing venue query:', queryError);
      return NextResponse.json({ 
        error: 'Failed to query venues', 
        details: queryError.message,
        stack: process.env.NODE_ENV === 'development' ? queryError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch venues', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    console.log('Starting POST request to create a venue...');
    await connectToDatabase();
    console.log('Database connection established for POST');
    
    // Get Venue model
    const Venue = await getVenueModel();
    console.log('Successfully initialized Venue model for POST');
    
    // Parse request body
    const venueData = await request.json();
    console.log('Venue data received:', venueData);
    
    // Set appId
    venueData.appId = venueData.appId || "1";
    
    // Handle geolocation
    if (venueData.latitude && venueData.longitude) {
      venueData.geolocation = {
        type: "Point",
        coordinates: [venueData.longitude, venueData.latitude]
      };
      
      // If masteredCityId is not provided, find the nearest city
      if (!venueData.masteredCityId) {
        console.log('Finding nearest city for coordinates:', venueData.longitude, venueData.latitude);
        const nearestCity = await findNearestCity(venueData.longitude, venueData.latitude);
        
        if (nearestCity) {
          console.log('Nearest city found:', nearestCity.cityName);
          venueData.masteredCityId = nearestCity._id;
          venueData.masteredDivisionId = nearestCity.masteredDivisionId?._id;
          venueData.masteredRegionId = nearestCity.masteredDivisionId?.masteredRegionId?._id;
          venueData.masteredCountryId = nearestCity.masteredDivisionId?.masteredRegionId?.masteredCountryId?._id;
        } else {
          console.log('No nearest city found, venue will be created without geo hierarchy links');
        }
      }
    }
    
    // Create new venue
    const venue = new Venue(venueData);
    await venue.save();
    console.log('Venue created with ID:', venue._id);
    
    return NextResponse.json({ 
      message: 'Venue created successfully', 
      venue 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating venue:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      return NextResponse.json({
        error: 'Validation error',
        validationErrors
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create venue', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}