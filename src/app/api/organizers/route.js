import { NextResponse } from 'next/server';
import axios from 'axios';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('appId') || "1";
    const isActive = searchParams.has('isActive') ? searchParams.get('isActive') : null;
    
    // Build the URL with proper query parameters
    let url = `${BE_URL}/api/organizers/all?appId=${appId}`;
    
    // If isActive is provided, add it to the URL
    // Note: The backend expects a 'true' or 'false' string, not a boolean
    if (isActive !== null) {
      url += `&isActive=${isActive}`;
    }
    
    console.log('Fetching organizers with URL:', url);
    const response = await axios.get(url);
    
    console.log('Successful organizers fetch, count:', response.data.length);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching organizers:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch organizers',
      details: error.response?.data?.message || error.message 
    }, { status: error.response?.status || 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    console.log('Creating organizer with data:', JSON.stringify(data, null, 2));
    
    // Set default appId if not provided
    if (!data.appId) {
      data.appId = "1";
    }
    
    // Check for required fields
    if (!data.fullName && !data.name) {
      return NextResponse.json({
        error: 'Organizer name is required',
        field: 'fullName/name'
      }, { status: 400 });
    }
    
    if (!data.shortName) {
      return NextResponse.json({
        error: 'Short name is required',
        field: 'shortName'
      }, { status: 400 });
    }
    
    try {
      // Create organizer data with all required fields - without user connection
      // The firebaseUserId and linkedUserLogin fields will be set later when
      // a user is connected to this organizer
      const organizerData = {
        appId: data.appId,
        fullName: data.fullName || data.name,
        shortName: data.shortName,
        description: data.description || "",
        organizerRegion: data.organizerRegion || "66c4d99042ec462ea22484bd", // Default US region ID
        // User connection fields are now optional
        firebaseUserId: null,  // No fake IDs - will be set when connected to a real user
        linkedUserLogin: null, // No fake IDs - will be set when connected to a real user
        isActive: data.isActive !== undefined ? data.isActive : true,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        wantRender: data.wantRender !== undefined ? data.wantRender : true,
        organizerTypes: {
          isEventOrganizer: true,
          isVenue: false,
          isTeacher: false,
          isMaestro: false,
          isDJ: false,
          isOrchestra: false,
          ...(data.organizerTypes || {})
        },
        publicContactInfo: {
          Email: data.contactInfo?.email || data.email || '',
          phone: data.contactInfo?.phone || data.phone || '',
          url: data.contactInfo?.website || data.website || ''
        }
      };
      
      console.log('Sending to backend:', JSON.stringify(organizerData, null, 2));
      
      try {
        // Try to modify the Organizer model's schema (temporary solution)
        const mongoose = require('mongoose');
        const connectToDatabase = require('@/lib/mongodb').default;
        
        // Connect to the database
        await connectToDatabase();
        
        // Modify the Organizer model schema to make linkedUserLogin and firebaseUserId optional
        // Note: This is a temporary solution until we can update the actual model
        const OrganizerSchema = new mongoose.Schema({
          appId: { type: String, required: true, default: "1" },
          linkedUserLogin: { type: mongoose.Schema.Types.ObjectId, required: false },
          firebaseUserId: { type: String, required: false },
          fullName: { type: String, required: true },
          shortName: { type: String, required: true }
        }, { collection: 'organizers', strict: false });
        
        // Create the organizer with direct MongoDB
        // Use model only if it doesn't exist
        if (!mongoose.models.Organizer) {
          mongoose.model('Organizer', OrganizerSchema);
        }
        
        const Organizer = mongoose.models.Organizer;
        
        // Create the organizer with required fields, but without linkedUserLogin
        const newOrganizer = new Organizer({
          ...organizerData,
          organizerRegion: new mongoose.Types.ObjectId(organizerData.organizerRegion),
        });
        
        const savedOrganizer = await newOrganizer.save();
        
        console.log('Organizer created via direct MongoDB:', savedOrganizer._id);
        
        return NextResponse.json(
          { 
            message: 'Organizer created successfully. Please connect it to a user to activate.', 
            organizer: savedOrganizer.toObject(),
            needsUserConnection: true
          },
          { status: 201 }
        );
      } catch (directDbError) {
        console.error('Direct MongoDB creation failed:', directDbError);
        
        // Fallback to API call
        try {
          // Call backend directly to create the organizer
          const response = await axios.post(`${BE_URL}/api/organizers`, organizerData);
          
          console.log('Organizer created successfully via API:', response.data);
          
          return NextResponse.json(
            { 
              message: 'Organizer created successfully. Please connect it to a user to activate.', 
              organizer: response.data,
              needsUserConnection: true
            },
            { status: 201 }
          );
        } catch (apiError) {
          console.error('API creation also failed:', apiError);
          throw new Error('Failed to create organizer via both direct DB and API methods');
        }
      }
    } catch (createError) {
      console.error('Error during organizer creation:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('Error creating organizer:', error);
    const errorDetails = error.response?.data || error.message;
    console.error('Error details:', errorDetails);
    
    return NextResponse.json({ 
      error: 'Failed to create organizer',
      details: JSON.stringify(errorDetails),
      message: typeof errorDetails === 'string' ? errorDetails : 'Unknown error occurred'
    }, { status: error.response?.status || 500 });
  }
}