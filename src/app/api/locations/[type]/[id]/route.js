import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { 
  getMasteredCountryModel, 
  getMasteredRegionModel, 
  getMasteredDivisionModel, 
  getMasteredCityModel
} from '@/lib/models';

async function getModelByType(type) {
  console.log(`Getting model for type: ${type}`);
  try {
    switch (type) {
      case 'country':
        return await getMasteredCountryModel();
      case 'region':
        return await getMasteredRegionModel();
      case 'division':
        return await getMasteredDivisionModel();
      case 'city':
        return await getMasteredCityModel();
      default:
        throw new Error(`Invalid location type: ${type}`);
    }
  } catch (error) {
    console.error(`Error getting model for type ${type}:`, error);
    throw error;
  }
}

export async function GET(request, { params }) {
  try {
    console.log(`Fetching ${params.type} with ID: ${params.id}`);
    await connectToDatabase();
    
    const { type, id } = params;
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing location type or ID' }, { status: 400 });
    }
    
    // Validate type
    if (!['country', 'region', 'division', 'city'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid location type. Must be one of: country, region, division, city' },
        { status: 400 }
      );
    }
    
    try {
      const Model = await getModelByType(type);
      let location;
      
      // Get the location with populated references
      switch (type) {
        case 'country':
          location = await Model.findById(id);
          break;
        case 'region':
          location = await Model.findById(id).populate('masteredCountryId');
          break;
        case 'division':
          location = await Model.findById(id).populate({
            path: 'masteredRegionId',
            populate: { path: 'masteredCountryId' }
          });
          break;
        case 'city':
          location = await Model.findById(id).populate({
            path: 'masteredDivisionId',
            populate: {
              path: 'masteredRegionId',
              populate: { path: 'masteredCountryId' }
            }
          });
          break;
      }
      
      if (!location) {
        return NextResponse.json({ error: `${type} with ID ${id} not found` }, { status: 404 });
      }
      
      // Force appId to "1" for all responses
      if (location.appId !== "1") {
        location.appId = "1";
      }
      
      console.log(`Successfully fetched ${type} with ID ${id}`);
      return NextResponse.json(location);
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      return NextResponse.json({ 
        error: `Failed to fetch ${type}`, 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Error in location GET route:`, error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    console.log(`Updating ${params.type} with ID: ${params.id}`);
    await connectToDatabase();
    
    const { type, id } = params;
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing location type or ID' }, { status: 400 });
    }
    
    // Validate type
    if (!['country', 'region', 'division', 'city'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid location type. Must be one of: country, region, division, city' },
        { status: 400 }
      );
    }
    
    // Validate the data
    const data = await request.json();
    console.log(`Update data for ${type}:`, JSON.stringify(data));
    
    // Always set appId to "1" regardless of what's provided
    data.appId = "1";
    
    try {
      const Model = await getModelByType(type);
      
      // Update using findByIdAndUpdate with validators to ensure data integrity
      const updatedLocation = await Model.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true }
      );
      
      if (!updatedLocation) {
        return NextResponse.json({ error: `${type} not found` }, { status: 404 });
      }
      
      console.log(`Successfully updated ${type} with ID ${id}`);
      return NextResponse.json({
        message: `${type} updated successfully`,
        location: updatedLocation
      });
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
      
      // Provide more detailed error messages for validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = {};
        
        for (const field in error.errors) {
          validationErrors[field] = error.errors[field].message;
        }
        
        return NextResponse.json({
          error: 'Validation error',
          validationErrors
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: `Failed to update ${type}`, 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Error updating ${params.type}:`, error);
    return NextResponse.json({ 
      error: `Failed to update ${params.type}`,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    console.log(`Deleting ${params.type} with ID: ${params.id}`);
    await connectToDatabase();
    
    const { type, id } = params;
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing location type or ID' }, { status: 400 });
    }
    
    // Validate type
    if (!['country', 'region', 'division', 'city'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid location type. Must be one of: country, region, division, city' },
        { status: 400 }
      );
    }
    
    try {
      // Check for dependencies before deleting
      let hasDependencies = false;
      let dependencyMessage = '';
      
      switch (type) {
        case 'country':
          // Check if any regions reference this country
          const MasteredRegion = await getMasteredRegionModel();
          const regionsUsingCountry = await MasteredRegion.countDocuments({ masteredCountryId: id });
          
          if (regionsUsingCountry > 0) {
            hasDependencies = true;
            dependencyMessage = `Cannot delete country: ${regionsUsingCountry} region(s) are associated with this country.`;
          }
          break;
          
        case 'region':
          // Check if any divisions reference this region
          const MasteredDivision = await getMasteredDivisionModel();
          const divisionsUsingRegion = await MasteredDivision.countDocuments({ masteredRegionId: id });
          
          if (divisionsUsingRegion > 0) {
            hasDependencies = true;
            dependencyMessage = `Cannot delete region: ${divisionsUsingRegion} division(s) are associated with this region.`;
          }
          break;
          
        case 'division':
          // Check if any cities reference this division
          const MasteredCity = await getMasteredCityModel();
          const citiesUsingDivision = await MasteredCity.countDocuments({ masteredDivisionId: id });
          
          if (citiesUsingDivision > 0) {
            hasDependencies = true;
            dependencyMessage = `Cannot delete division: ${citiesUsingDivision} city/cities are associated with this division.`;
          }
          break;
          
        // Cities don't need dependency check as they don't have child entities in this schema
      }
      
      if (hasDependencies) {
        return NextResponse.json({ error: dependencyMessage }, { status: 400 });
      }
      
      // Proceed with deletion if no dependencies
      const Model = await getModelByType(type);
      const result = await Model.findByIdAndDelete(id);
      
      if (!result) {
        return NextResponse.json({ error: `${type} with ID ${id} not found` }, { status: 404 });
      }
      
      console.log(`Successfully deleted ${type} with ID ${id}`);
      return NextResponse.json({ message: `${type} deleted successfully` });
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      return NextResponse.json({ 
        error: `Failed to delete ${type}`, 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Error in location DELETE route:`, error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
