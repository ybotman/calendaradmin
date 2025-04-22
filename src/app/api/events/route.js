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
  try {
    const url = new URL(request.url);
    const appId = url.searchParams.get('appId');
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
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
    await connectToDatabase();
    
    // Build query
    const query = {
      appId,
      startDate: { $gte: startDate },
      endDate: { $lte: endDate }
    };
    
    // Add geo location filters if provided
    if (masteredRegionName) query.masteredRegionName = masteredRegionName;
    if (masteredDivisionName) query.masteredDivisionName = masteredDivisionName;
    if (masteredCityName) query.masteredCityName = masteredCityName;
    
    // Add organizer filter if provided
    if (organizerId) {
      query.$or = [
        { ownerOrganizerID: organizerId },
        { grantedOrganizerID: organizerId },
        { alternateOrganizerID: organizerId }
      ];
    }
    
    // Add category filter if provided
    if (category) query.categoryFirst = category;
    
    // Add venue filter if provided
    if (venueId) query.venueID = venueId;
    
    // Fetch events
    const events = await Event.find(query)
      .sort({ startDate: 1 })
      .limit(400); // Limit to a reasonable number
    
    // Return events
    return NextResponse.json({
      events,
      pagination: {
        total: events.length,
        limit: 400
      },
      query
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Error fetching events', details: error.message },
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