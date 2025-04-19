import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(request) {
  try {
    console.log('Attempting to clear audit logs from all users...');
    
    // Connect to MongoDB
    await connectToDatabase();
    
    // Get request body for optional filters
    const body = await request.json();
    const appId = body.appId || '1';
    
    // Create a minimal UserLogins schema that can access the collection
    const UserLoginsSchema = new mongoose.Schema({
      appId: String,
      firebaseUserId: String,
      auditLog: Array,
    }, { collection: 'userlogins', strict: false });
    
    const UserLogins = mongoose.models.UserLogins || mongoose.model('UserLogins', UserLoginsSchema);
    
    // Find all users with the specified appId
    const users = await UserLogins.find({ appId });
    console.log(`Found ${users.length} users with appId ${appId}`);
    
    // Stats to track the operation
    let stats = {
      totalUsers: users.length,
      usersWithAuditLogs: 0,
      entriesRemoved: 0,
      spaceSavedBytes: 0,
      updatedUsers: 0,
      errors: 0
    };
    
    // Process each user
    for (const user of users) {
      try {
        // Calculate space used by audit logs (rough estimate)
        const auditLogSizeBytes = user.auditLog ? 
          JSON.stringify(user.auditLog).length : 0;
        
        // Check if user has audit logs
        if (user.auditLog && user.auditLog.length > 0) {
          stats.usersWithAuditLogs++;
          stats.entriesRemoved += user.auditLog.length;
          stats.spaceSavedBytes += auditLogSizeBytes;
          
          // Remove audit logs
          user.auditLog = [];
          
          // Save user without triggering the pre-save hook
          // This is important to prevent creating new audit log entries
          await UserLogins.updateOne(
            { _id: user._id },
            { $set: { auditLog: [] } }
          );
          
          stats.updatedUsers++;
        }
      } catch (userError) {
        console.error(`Error processing user ${user._id}:`, userError);
        stats.errors++;
      }
    }
    
    // Calculate space saved in KB and MB
    stats.spaceSavedKB = Math.round(stats.spaceSavedBytes / 1024);
    stats.spaceSavedMB = Math.round(stats.spaceSavedBytes / (1024 * 1024) * 100) / 100;
    
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${stats.totalUsers} users, cleared audit logs from ${stats.usersWithAuditLogs} users`,
      stats
    });
  } catch (error) {
    console.error('Error clearing audit logs:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// For checking status - GET endpoint
export async function GET() {
  try {
    await connectToDatabase();
    
    // Create a minimal UserLogins schema
    const UserLoginsSchema = new mongoose.Schema({
      appId: String,
      firebaseUserId: String,
      auditLog: Array,
    }, { collection: 'userlogins', strict: false });
    
    const UserLogins = mongoose.models.UserLogins || mongoose.model('UserLogins', UserLoginsSchema);
    
    // Get stats about audit logs
    const allUsers = await UserLogins.find({});
    const usersWithAuditLogs = allUsers.filter(user => user.auditLog && user.auditLog.length > 0);
    
    // Calculate total entries and rough size estimate
    let totalEntries = 0;
    let totalSizeBytes = 0;
    
    usersWithAuditLogs.forEach(user => {
      totalEntries += user.auditLog.length;
      totalSizeBytes += JSON.stringify(user.auditLog).length;
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: allUsers.length,
        usersWithAuditLogs: usersWithAuditLogs.length,
        totalAuditLogEntries: totalEntries,
        estimatedSizeKB: Math.round(totalSizeBytes / 1024),
        estimatedSizeMB: Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100,
        usersByAppId: allUsers.reduce((acc, user) => {
          const appId = user.appId || 'unknown';
          acc[appId] = (acc[appId] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error getting audit log stats:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}