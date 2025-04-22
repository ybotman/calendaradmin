import { NextResponse } from 'next/server';

/**
 * GET handler for fetching a single venue by ID - proxies to backend
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.id - The venue ID
 * @returns {Promise<Response>} JSON response with the venue data
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log(`Fetching venue with ID: ${id} - Proxying to backend`);
    
    // Get the URL and search params
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Log the request for debugging
    console.log('Request URL:', url.toString());
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const appId = searchParams.get('appId');
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Construct the backend API URL
    const apiUrl = `${backendUrl}/api/venues/${id}?${searchParams.toString()}`;
    console.log('Proxying request to backend:', apiUrl);
    
    try {
      // Forward the request to the backend
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Check if the request was successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Backend API error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        
        return NextResponse.json(
          { 
            error: 'Backend API error', 
            details: errorData.message || response.statusText,
            status: response.status,
          },
          { status: response.status }
        );
      }
      
      // Get the response data
      const data = await response.json();
      console.log(`Successfully received venue data from backend`);
      
      // Return the data to the client
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error fetching from backend:', fetchError);
      
      // If we can't connect to the backend, return a 503 Service Unavailable
      return NextResponse.json(
        { 
          error: 'Backend service unavailable', 
          details: fetchError.message 
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Error in API route:', error);
    
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
        error: 'Internal server error', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating venue data - proxies to backend
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.id - The venue ID
 * @returns {Promise<Response>} JSON response with the updated venue
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    console.log(`Updating venue with ID: ${id} - Proxying to backend`);
    
    // Get the request body
    const body = await request.json();
    const appId = body.appId;
    
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    console.log(`Update data for venue:`, JSON.stringify(body));
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Forward request to backend
    const response = await fetch(`${backendUrl}/api/venues/${id}?appId=${appId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(errorData, { status: response.status });
    }
    
    // Pass through the backend response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error updating venue:`, error);
    return NextResponse.json(
      { error: 'Error updating venue', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing a venue - proxies to backend
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.id - The venue ID
 * @returns {Promise<Response>} JSON response with success or error message
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    console.log(`Deleting venue with ID: ${id} - Proxying to backend`);
    
    // Get the URL and search params
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const appId = searchParams.get('appId');
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Forward request to backend
    const response = await fetch(`${backendUrl}/api/venues/${id}?appId=${appId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return NextResponse.json(errorData, { status: response.status });
    }
    
    // Pass through the backend response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error deleting venue:`, error);
    return NextResponse.json(
      { error: 'Error deleting venue', details: error.message },
      { status: 500 }
    );
  }
}