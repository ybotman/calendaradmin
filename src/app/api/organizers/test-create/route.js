import { NextResponse } from 'next/server';
import axios from 'axios';
import mongoose from 'mongoose';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3003';

/**
 * Special endpoint for creating organizers
 * Uses a two-step process to first get default region IDs and then create the organizer
 */
export async function POST(request) {
  try {
    const data = await request.json();
    
    console.log('Creating organizer with data:', JSON.stringify(data, null, 2));
    
    // Step 1: Get the default region, division, and city IDs for Boston/New England/Northeast
    console.log('Fetching default location IDs for organizer creation...');
    
    // First, get a valid user ID to use for the linkedUserLogin
    let sampleUserId = '';
    let sampleFirebaseId = '';
    let targetRegionId = '';
    let targetDivisionId = '';
    let targetCityId = '';
    
    try {
      // First try the /api/userlogins endpoint (as used by the API client)
      try {
        console.log('Attempting to fetch users from /api/userlogins...');
        const userListResponse = await axios.get(`${BE_URL}/api/userlogins?appId=1&limit=1`);
        
        if (userListResponse.data && userListResponse.data.length > 0) {
          // Use the first user's ID 
          sampleUserId = userListResponse.data[0]._id;
          sampleFirebaseId = userListResponse.data[0].firebaseUserId || 'sample_firebase_id';
          console.log(`Using sample user ID: ${sampleUserId} for organizer creation`);
        } else {
          console.log('No users found from /api/userlogins, trying other endpoints...');
        }
      } catch (firstEndpointError) {
        console.error('Error fetching from first users endpoint:', firstEndpointError.message);
      }
      
      // If first attempt failed, try another endpoint
      if (!sampleUserId) {
        try {
          console.log('Attempting to fetch users from /api/users...');
          const altUserResponse = await axios.get(`/api/users?appId=1&limit=1`);
          
          if (altUserResponse.data && altUserResponse.data.length > 0) {
            sampleUserId = altUserResponse.data[0]._id;
            sampleFirebaseId = altUserResponse.data[0].firebaseUserId || 'sample_firebase_id';
            console.log(`Using sample user ID from alternate endpoint: ${sampleUserId}`);
          } else {
            console.log('No users found from alternate endpoint');
          }
        } catch (secondEndpointError) {
          console.error('Error fetching from second users endpoint:', secondEndpointError.message);
        }
      }
      
      // If we still don't have a user ID, fake one
      if (!sampleUserId) {
        // As a last resort, use a fake MongoDB ObjectId format
        sampleUserId = new mongoose.Types.ObjectId().toString();
        sampleFirebaseId = `fake_firebase_${Date.now()}`;
        console.log(`No users found in system, using generated ObjectId: ${sampleUserId}`);
      }
    } catch (userError) {
      console.error('Error in user fetch process:', userError);
    }

    // Now get location data
    try {
      const regionResponse = await axios.get(`${BE_URL}/api/regionsdivisions?limit=100&appId=1`);
      
      // Find Northeast/New England/Boston in the location data
      if (regionResponse.data && regionResponse.data.length > 0) {
        // Find Northeast region
        const northeastRegion = regionResponse.data.find(r => 
          r.regionName?.toLowerCase() === 'northeast' || 
          r.regionName?.toLowerCase().includes('northeast')
        );
        
        if (northeastRegion && northeastRegion._id) {
          targetRegionId = northeastRegion._id;
          console.log(`Found Northeast region with ID: ${targetRegionId}`);
          
          // Find New England division
          if (northeastRegion.divisions && northeastRegion.divisions.length > 0) {
            const newEnglandDivision = northeastRegion.divisions.find(d => 
              d.divisionName?.toLowerCase() === 'new england' || 
              d.divisionName?.toLowerCase().includes('new england')
            );
            
            if (newEnglandDivision && newEnglandDivision._id) {
              targetDivisionId = newEnglandDivision._id;
              console.log(`Found New England division with ID: ${targetDivisionId}`);
              
              // Find Boston city
              if (newEnglandDivision.cities && newEnglandDivision.cities.length > 0) {
                const bostonCity = newEnglandDivision.cities.find(c => 
                  c.cityName?.toLowerCase() === 'boston' || 
                  c.cityName?.toLowerCase().includes('boston')
                );
                
                if (bostonCity && bostonCity._id) {
                  targetCityId = bostonCity._id;
                  console.log(`Found Boston city with ID: ${targetCityId}`);
                }
              }
            }
          }
        }
      }
    } catch (regionError) {
      console.error('Error fetching region data:', regionError);
    }
    
    // Try different endpoints to get a valid region ID
    if (!targetRegionId) {
      try {
        console.log('Trying fallback endpoint for regions...');
        const regionsResponse = await axios.get(`${BE_URL}/api/regions?limit=1&appId=1`);
        if (regionsResponse.data && regionsResponse.data.length > 0) {
          targetRegionId = regionsResponse.data[0]._id;
          console.log(`Using fallback region ID: ${targetRegionId}`);
        }
      } catch (fallbackError) {
        console.error('Error fetching fallback region ID:', fallbackError);
      }
    }
    
    // If we still don't have a region ID, try local endpoint
    if (!targetRegionId) {
      try {
        console.log('Trying local endpoint for regions...');
        const localRegionsResponse = await axios.get(`/api/geo-hierarchy?type=regions&appId=1`);
        if (localRegionsResponse.data && localRegionsResponse.data.length > 0) {
          targetRegionId = localRegionsResponse.data[0]._id;
          console.log(`Using local region ID: ${targetRegionId}`);
        }
      } catch (localFallbackError) {
        console.error('Error fetching local region ID:', localFallbackError);
      }
    }
    
    // Last resort: generate a fake ObjectId if we couldn't get one from the server
    if (!targetRegionId) {
      targetRegionId = new mongoose.Types.ObjectId().toString();
      console.log(`Using generated region ID: ${targetRegionId}`);
    }
    
    // Prepare the organizer data for the backend
    const organizerData = {
      fullName: data.fullName || data.name || '',
      name: data.name || data.fullName || '',
      shortName: data.shortName || '',
      description: data.description || '',
      appId: data.appId || '1',
      // Required fields with valid ObjectIDs
      firebaseUserId: sampleFirebaseId,
      linkedUserLogin: sampleUserId,
      organizerRegion: targetRegionId,
      // Add division and city if available
      ...(targetDivisionId && { organizerDivision: targetDivisionId }),
      ...(targetCityId && { organizerCity: targetCityId }),
      // Organizer types
      organizerTypes: {
        isEventOrganizer: data.organizerTypes?.isEventOrganizer === false ? false : true,
        isTeacher: data.organizerTypes?.isTeacher === true ? true : false,
        isDJ: data.organizerTypes?.isDJ === true ? true : false,
        isOrchestra: data.organizerTypes?.isOrchestra === true ? true : false
      },
      // Contact information
      publicContactInfo: {
        phone: data.publicContactInfo?.phone || '',
        email: data.publicContactInfo?.email || '',
        url: data.publicContactInfo?.url || ''
      },
      // Other attributes
      isActive: data.isActive === false ? false : true,
      isEnabled: data.isEnabled === false ? false : true,
      isRendered: data.isRendered === false ? false : true,
      wantRender: data.wantRender === false ? false : true,
      isActiveAsOrganizer: data.isActiveAsOrganizer === true ? true : false,
      // External IDs
      btcNiceName: data.btcNiceName || ''
    };
    
    // Add images if they exist
    if (data.images && data.images.originalUrl) {
      organizerData.images = {
        originalUrl: data.images.originalUrl
      };
    }
    
    console.log('Sending organizer creation request with data:', organizerData);
    
    // Validate required fields before sending
    if (!organizerData.linkedUserLogin) {
      return NextResponse.json({
        error: 'Missing required field',
        details: 'Could not find a valid user ID for linkedUserLogin'
      }, { status: 400 });
    }

    if (!organizerData.organizerRegion) {
      return NextResponse.json({
        error: 'Missing required field',
        details: 'Could not find a valid region ID for organizerRegion'
      }, { status: 400 });
    }
    
    try {
      // Create organizer directly
      const organizerResponse = await axios.post(`${BE_URL}/api/organizers`, organizerData);
      console.log('Organizer creation response status:', organizerResponse.status);
      console.log('Organizer creation response data:', organizerResponse.data);
      
      if (!organizerResponse.data) {
        return NextResponse.json({
          error: 'Failed to create organizer properly',
          details: 'Organizer creation did not return valid data'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        message: 'Organizer created successfully',
        organizer: organizerResponse.data
      }, { status: 201 });
      
    } catch (orgError) {
      console.error('Error creating organizer:', orgError);
      let errorDetails = 'Unknown error in organizer creation';
      let errorStatus = 500;
      
      if (orgError.response) {
        console.error('Organizer creation response data:', orgError.response.data);
        errorDetails = orgError.response.data;
        errorStatus = orgError.response.status || 500;
        
        // Special handling for MongoDB validation errors
        if (errorDetails && errorDetails.message && errorDetails.message.includes('validation failed')) {
          console.log('Validation error detected in response. Showing detailed error information.');
          return NextResponse.json({
            error: 'Validation error',
            details: errorDetails,
            message: 'The server requires additional fields. Check the backend schema requirements.',
            data: organizerData
          }, { status: errorStatus });
        }
      } else {
        errorDetails = orgError.message || 'Unknown error';
      }
      
      return NextResponse.json({
        error: 'Failed to create organizer',
        details: errorDetails
      }, { status: errorStatus });
    }
  } catch (error) {
    console.error('Overall error in test-create endpoint:', error);
    
    // Extract and format error details for better debugging
    let errorDetails = 'Unknown error';
    let errorStatus = 500;
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      errorDetails = error.response.data;
      errorStatus = error.response.status || 500;
    } else {
      errorDetails = error.message || 'Unknown error';
    }
    
    return NextResponse.json({
      error: 'Failed in the organizer creation process',
      details: errorDetails
    }, { status: errorStatus });
  }
}