import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';

/**
 * GET handler for fetching a single event by ID
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.id - The event ID
 * @returns {Promise<Response>} JSON response with the event data
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const appId = url.searchParams.get('appId');
    
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    const event = await Event.findOne({ _id: id, appId });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Error fetching event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating an event
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.id - The event ID
 * @returns {Promise<Response>} JSON response with the updated event
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const { appId } = data;
    
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Verify event exists and belongs to the specified app
    const existingEvent = await Event.findOne({ _id: id, appId });
    
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Don't allow changing the owner (for simplicity in this implementation)
    delete data.ownerOrganizerID;
    
    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    
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
      { error: 'Error updating event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing an event
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.id - The event ID
 * @returns {Promise<Response>} JSON response with success message
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const url = new URL(request.url);
    const appId = url.searchParams.get('appId');
    
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    // Verify event exists and belongs to the specified app
    const existingEvent = await Event.findOne({ _id: id, appId });
    
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Delete the event
    await Event.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Event deleted successfully', eventId: id });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Error deleting event', details: error.message },
      { status: 500 }
    );
  }
}