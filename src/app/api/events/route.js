import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';

/**
 * GET handler for events
 * 
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} JSON response with events data
 */
export async function GET(request) {
  console.log('Events API endpoint called');
  
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Validate URL and params
    console.log('Request URL:', url.toString());
    console.log('Search params keys:', Array.from(searchParams.keys()));
    
    const appId = searchParams.get('appId');
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    // Log the request for debugging
    console.log(`Events API request with params:`, {
      appId,
      start: searchParams.get('start'),
      end: searchParams.get('end'),
      region: searchParams.get('masteredRegionName'),
      division: searchParams.get('masteredDivisionName'),
      city: searchParams.get('masteredCityName'),
      organizerId: searchParams.get('organizerId'),
      category: searchParams.get('category'),
      venue: searchParams.get('venue')
    });
    
    // Get filter parameters
    const masteredRegionName = url.searchParams.get('masteredRegionName');
    const masteredDivisionName = url.searchParams.get('masteredDivisionName');
    const masteredCityName = url.searchParams.get('masteredCityName');
    const organizerId = url.searchParams.get('organizerId');
    const category = url.searchParams.get('category');
    const venueId = url.searchParams.get('venue');
    
    // Get date range
    const startParam = url.searchParams.get('start');
    const endParam = url.searchParams.get('end');
    
    let startDate, endDate;
    
    if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(endParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
    } else {
      // Default date range is current month to 3 months ahead
      startDate = new Date();
      endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
    }
    
    // Connect to the database
    try {
      await connectToDatabase();
      console.log('MongoDB connection successful');
      
      // Validate model exists
      if (!Event || typeof Event.find !== 'function') {
        console.error('Event model is not valid', { Event });
        throw new Error('Invalid Event model');
      }
      
      // Check model definition
      console.log('Event schema paths:', Object.keys(Event.schema.paths));
    } catch (dbError) {
      console.error('MongoDB connection failed:', dbError);
      throw new Error(`Database connection failed: ${dbError.message}`);
    }
    
    // Build query safely - handle potential date issues
    let query = { appId };
    
    // Add date range if dates are valid
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      query.startDate = { $lte: endDate };
      query.endDate = { $gte: startDate };
    } else {
      console.warn('Invalid date values, skipping date filter', { 
        startDate: startDate?.toString(), 
        endDate: endDate?.toString()
      });
    }
    
    // Add geo location filters if provided
    if (masteredRegionName) query.masteredRegionName = masteredRegionName;
    if (masteredDivisionName) query.masteredDivisionName = masteredDivisionName;
    if (masteredCityName) query.masteredCityName = masteredCityName;
    
    // Add organizer filter if provided
    if (organizerId) {
      try {
        // Convert string ID to ObjectId
        const mongoose = (await import('mongoose')).default;
        const organizerObjectId = new mongoose.Types.ObjectId(organizerId);
        
        query.$or = [
          { ownerOrganizerID: organizerObjectId },
          { grantedOrganizerID: organizerObjectId },
          { alternateOrganizerID: organizerObjectId }
        ];
      } catch (error) {
        console.warn(`Invalid organizerId format: ${organizerId}, using as string`);
        query.$or = [
          { ownerOrganizerID: organizerId },
          { grantedOrganizerID: organizerId },
          { alternateOrganizerID: organizerId }
        ];
      }
    }
    
    // Add category filter if provided
    if (category) query.categoryFirst = category;
    
    // Add venue filter if provided
    if (venueId) {
      try {
        // If organizer is already set with $or, need to handle that
        if (query.$or) {
          const existingOr = [...query.$or];
          delete query.$or;
          
          // Convert string ID to ObjectId
          const mongoose = (await import('mongoose')).default;
          const venueObjectId = new mongoose.Types.ObjectId(venueId);
          
          // Build venue conditions
          const venueConditions = [
            { venueID: venueObjectId },
            { locationID: venueObjectId }
          ];
          
          // Combine with AND
          query.$and = [
            { $or: existingOr },
            { $or: venueConditions }
          ];
        } else {
          // Convert string ID to ObjectId
          const mongoose = (await import('mongoose')).default;
          const venueObjectId = new mongoose.Types.ObjectId(venueId);
          
          // Simple $or for venue only
          query.$or = [
            { venueID: venueObjectId },
            { locationID: venueObjectId }
          ];
        }
      } catch (error) {
        console.warn(`Invalid venueId format: ${venueId}, using as string`);
        
        // Similar logic for string IDs
        if (query.$or) {
          const existingOr = [...query.$or];
          delete query.$or;
          
          // Build venue conditions
          const venueConditions = [
            { venueID: venueId },
            { locationID: venueId }
          ];
          
          // Combine with AND
          query.$and = [
            { $or: existingOr },
            { $or: venueConditions }
          ];
        } else {
          query.$or = [
            { venueID: venueId },
            { locationID: venueId }
          ];
        }
      }
    }
    
    console.log('Final MongoDB query:', JSON.stringify(query, null, 2));
    
    try {
      // Validate Event model
      if (!Event || typeof Event.find !== 'function') {
        throw new Error('Event model is not properly defined or imported');
      }
      
      // Fetch events with a try/catch specifically for the query operation
      const events = await Event.find(query)
        .sort({ startDate: 1 })
        .limit(400) // Limit to a reasonable number
        .lean(); // Use lean() for better performance
      
      console.log(`Successfully retrieved ${events.length} events`);
      return NextResponse.json({
        events,
        pagination: {
          total: events.length,
          limit: 400
        },
        query
      });
    } catch (queryError) {
      console.error('MongoDB query error:', queryError);
      return NextResponse.json(
        { 
          error: 'Database query failed', 
          details: queryError.message,
          query: query
        },
        { status: 500 }
      );
    }
    
    // The function returns in the try/catch block above
  } catch (error) {
    console.error('Error fetching events:', error);
    
    // Add more debug information
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    
    // Log the detailed error
    console.error('Detailed error:', JSON.stringify(errorDetails, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Error fetching events', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating events
 * 
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} JSON response with the created event
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const { appId } = data;
    
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    if (!data.title || !data.startDate || !data.endDate || !data.ownerOrganizerID) {
      return NextResponse.json(
        { error: 'title, startDate, endDate, and ownerOrganizerID are required' },
        { status: 400 }
      );
    }
    
    // Set default expiration date if not provided (1 year from now)
    if (!data.expiresAt) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      data.expiresAt = oneYearFromNow;
    }
    
    // Connect to the database
    await connectToDatabase();
    
    // Create new event
    const event = new Event(data);
    await event.save();
    
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      
      return NextResponse.json(
        { error: 'Validation error', details: validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error creating event', details: error.message },
      { status: 500 }
    );
  }
}