import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import { validateAppId } from '@/utils/api-validation';

// Direct model definitions to avoid importing from calendar-be
let modelsCache = {};

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

export async function GET(request) {
  try {
    console.log('Starting nearest-city API request...');
    await connectToDatabase();
    console.log('Database connection established');
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const longitude = parseFloat(searchParams.get('longitude'));
    const latitude = parseFloat(searchParams.get('latitude'));
    
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
    
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    
    // Validate parameters
    if (isNaN(longitude) || isNaN(latitude)) {
      return NextResponse.json({ 
        error: 'Invalid coordinates. Both longitude and latitude must be provided as numbers.' 
      }, { status: 400 });
    }
    
    console.log(`Finding nearest cities to coordinates: [${longitude}, ${latitude}], appId: ${appId}`);
    
    // Get MasteredCity model
    const MasteredCity = await getMasteredCityModel();
    
    // Find nearest cities
    const nearestCities = await MasteredCity.find({
      appId,
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
        },
      },
    })
    .limit(limit)
    .populate({
      path: 'masteredDivisionId',
      populate: {
        path: 'masteredRegionId',
        populate: { path: 'masteredCountryId' }
      }
    });
    
    console.log(`Found ${nearestCities.length} nearest cities`);
    
    // Calculate distances for each city
    const citiesWithDistance = nearestCities.map(city => {
      // Basic distance calculation for sorting purposes
      const cityCoords = city.location.coordinates;
      const distance = calculateDistance(
        latitude, 
        longitude, 
        cityCoords[1], 
        cityCoords[0]
      );
      
      return {
        ...city.toObject(),
        distance: distance,
        distanceInKm: distance.toFixed(1),
        distanceInMiles: (distance * 0.621371).toFixed(1)
      };
    });
    
    return NextResponse.json(citiesWithDistance);
  } catch (error) {
    console.error('Error finding nearest cities:', error);
    return NextResponse.json({ 
      error: 'Failed to find nearest cities', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Haversine formula to calculate distance between two points on Earth
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}