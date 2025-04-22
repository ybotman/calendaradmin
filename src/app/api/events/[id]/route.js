import { NextResponse } from 'next/server';

/**
 * GET handler for fetching a single event by ID - proxies to backend
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
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Forward request to backend
    const response = await fetch(`${backendUrl}/api/events/id/${id}?appId=${appId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(errorData, { status: response.status });
    }
    
    // Pass through the backend response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Error fetching event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating an event - proxies to backend
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
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Forward request to backend
    const response = await fetch(`${backendUrl}/api/events/${id}?appId=${appId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    // Pass through the backend response
    const responseData = await response.json();
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Error updating event', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing an event - proxies to backend
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
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Forward request to backend
    const response = await fetch(`${backendUrl}/api/events/${id}?appId=${appId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Pass through the backend response
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Error deleting event', details: error.message },
      { status: 500 }
    );
  }
}