import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Application from '@/models/Application';

/**
 * API route to fetch available applications
 * Supports filtering by active status
 * 
 * @param {Request} request - The request object
 * @returns {NextResponse} Response containing applications
 */
export async function GET(request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const active = searchParams.has('active') ? searchParams.get('active') === 'true' : undefined;
    
    // Build query
    const query = {};
    if (active !== undefined) query.isActive = active;
    
    // Fetch applications
    const applications = await Application.find(query)
      .populate('settings.defaultRegionId')
      .populate('settings.defaultDivisionId')
      .populate('settings.defaultCityId')
      .sort({ name: 1 });

    // Map applications to format expected by frontend
    const mappedApplications = applications.map(app => ({
      id: app.appId,  // Map appId to id for consistent frontend usage
      name: app.name,
      description: app.description,
      url: app.url,
      logoUrl: app.logoUrl,
      active: app.isActive,
      settings: app.settings
    }));
    
    // Fallback to default apps if none found
    if (!mappedApplications || mappedApplications.length === 0) {
      console.warn('No applications found in database, returning defaults');
      return NextResponse.json([
        { id: '1', name: 'TangoTiempo', active: true },
        { id: '2', name: 'HarmonyJunction', active: true }
      ]);
    }
    
    return NextResponse.json(mappedApplications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    
    // Return default apps on error for fail-safe operation
    return NextResponse.json(
      [
        { id: '1', name: 'TangoTiempo', active: true },
        { id: '2', name: 'HarmonyJunction', active: true }
      ],
      { status: 200 } // Still return 200 to prevent client errors
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const data = await request.json();
    
    // Ensure appId is unique
    const existingApp = await Application.findOne({ appId: data.appId });
    if (existingApp) {
      return NextResponse.json(
        { error: 'Application with this appId already exists' },
        { status: 400 }
      );
    }
    
    // Create new application
    const newApplication = new Application(data);
    await newApplication.save();
    
    return NextResponse.json(
      { message: 'Application created successfully', application: newApplication },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 });
  }
}