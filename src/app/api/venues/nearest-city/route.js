import { NextResponse } from 'next/server';

/**
 * GET handler for finding the nearest city to a venue - proxies to backend
 * 
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} JSON response with the nearest city
 */
export async function GET(request) {
  console.log('Venues nearest-city API endpoint called - Proxying to backend');
  
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Log the request for debugging
    console.log('Request URL:', url.toString());
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const appId = searchParams.get('appId');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Construct the backend API URL
    const apiUrl = `${backendUrl}/api/venues/nearest-city?${searchParams.toString()}`;
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
      console.log(`Successfully received nearest city data from backend`);
      
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