import { NextResponse } from 'next/server';

/**
 * GET handler for fetching a single geo hierarchy item by ID - proxies to backend
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.type - The geo hierarchy type (country, region, division, city)
 * @param {string} params.id - The item ID
 * @returns {Promise<Response>} JSON response with the geo hierarchy item
 */
export async function GET(request, { params }) {
  try {
    const { type, id } = params;
    console.log(`Fetching ${type} with ID: ${id} - Proxying to backend`);
    
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
    
    // Validate type
    if (!['country', 'region', 'division', 'city'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid geo hierarchy type. Must be one of: country, region, division, city' },
        { status: 400 }
      );
    }
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Use the locations API endpoint for geo hierarchy data
    const apiUrl = `${backendUrl}/api/locations/${type}/${id}?${searchParams.toString()}`;
    console.log('Proxying request to backend with locations API:', apiUrl);
    
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
      console.log(`Successfully received data for ${type} with ID: ${id}`);
      
      // Adapt the response format if needed
      // The backend response may have a different structure than what the frontend expects
      if (data && typeof data === 'object') {
        console.log(`Received data type: ${data.locationType || 'unknown'}`);
        
        // Format the response to match the expected structure
        if (type === 'country' && data.countryName) {
          data.type = 'country';
          data.displayName = data.countryName;
        } else if (type === 'region' && data.regionName) {
          data.type = 'region';
          data.displayName = data.regionName;
        } else if (type === 'division' && data.divisionName) {
          data.type = 'division';
          data.displayName = data.divisionName;
        } else if (type === 'city' && data.cityName) {
          data.type = 'city';
          data.displayName = data.cityName;
        }
      }
      
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
 * PUT handler for updating a geo hierarchy item - proxies to backend
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.type - The geo hierarchy type
 * @param {string} params.id - The item ID
 * @returns {Promise<Response>} JSON response with the updated item
 */
export async function PUT(request, { params }) {
  try {
    const { type, id } = params;
    console.log(`Updating ${type} with ID: ${id} - Proxying to backend`);
    
    // Get the URL and search params
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const appId = searchParams.get('appId');
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    // Validate type
    if (!['country', 'region', 'division', 'city'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid geo hierarchy type. Must be one of: country, region, division, city' },
        { status: 400 }
      );
    }
    
    // Get the request body
    const body = await request.json();
    console.log(`Update data for ${type}:`, JSON.stringify(body));
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Forward request to backend using the locations API
    const response = await fetch(`${backendUrl}/api/locations/${type}/${id}?appId=${appId}`, {
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
    console.error(`Error updating geo hierarchy item:`, error);
    return NextResponse.json(
      { error: 'Error updating geo hierarchy item', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing a geo hierarchy item - proxies to backend
 * 
 * @param {Request} request - The incoming request
 * @param {Object} params - Route parameters
 * @param {string} params.type - The geo hierarchy type
 * @param {string} params.id - The item ID
 * @returns {Promise<Response>} JSON response with success or error message
 */
export async function DELETE(request, { params }) {
  try {
    const { type, id } = params;
    console.log(`Deleting ${type} with ID: ${id} - Proxying to backend`);
    
    // Get the URL and search params
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const appId = searchParams.get('appId');
    
    // Required parameters
    if (!appId) {
      return NextResponse.json({ error: 'appId is required' }, { status: 400 });
    }
    
    // Validate type
    if (!['country', 'region', 'division', 'city'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid geo hierarchy type. Must be one of: country, region, division, city' },
        { status: 400 }
      );
    }
    
    // Backend URL from environment variable with fallback
    const backendUrl = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';
    
    // Forward request to backend using the locations API
    const response = await fetch(`${backendUrl}/api/locations/${type}/${id}?appId=${appId}`, {
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
    console.error(`Error deleting geo hierarchy item:`, error);
    return NextResponse.json(
      { error: 'Error deleting geo hierarchy item', details: error.message },
      { status: 500 }
    );
  }
}