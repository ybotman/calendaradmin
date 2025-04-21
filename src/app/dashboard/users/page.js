'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import UserEditForm from '@/components/users/UserEditForm';
import { usersApi, rolesApi } from '@/lib/api-client';
import axios from 'axios';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [appId, setAppId] = useState('1'); // Default to TangoTiempo
  const [editingUser, setEditingUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [creatingOrganizer, setCreatingOrganizer] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    active: true,
    isOrganizer: false,
  });

  // Helper function to convert role IDs to role codes
  const getRoleCodeForId = (roleId) => {
    try {
      // Only process if we have roles loaded
      if (!roles?.roles || !Array.isArray(roles.roles) || roles.roles.length === 0) {
        console.log(`No roles available to match ID ${roleId}`);
        return '';
      }
      
      // For NamedUser hardcoded ID, return "NU" directly
      if (roleId === '66cb85ac74dca51e34e268ed') {
        return 'NU';
      }
      
      // Find the matching role
      const role = roles.roles.find(r => r._id === roleId);
      
      if (role) {
        console.log(`Matched role ${roleId} to code ${role.roleNameCode || 'unknown code'}`);
      } else {
        console.log(`No match found for role ID ${roleId}`);
      }
      
      // Return the roleNameCode if found, empty string otherwise
      return role?.roleNameCode || '';
    } catch (error) {
      console.error('Error in getRoleCodeForId:', error);
      return '';
    }
  };
  
  // Function to refresh users
  const refreshUsers = async () => {
    try {
      setLoading(true);
      
      // Add a small delay to ensure backend has time to process any updates
      // This helps with the refresh issues between tabs
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use timestamp to force fresh data - add randomness to avoid cache
      const timestamp = new Date().getTime() + Math.floor(Math.random() * 1000);
      
      let usersData = [];
      let organizersData = [];
      
      // Access the current roles list from state to use for lookups
      const currentRoles = roles;
      
      try {
        // Only fetch user login records - we no longer need to combine with organizers
        console.log('Fetching user login records...');
        const usersResponse = await fetch(`http://localhost:3010/api/userlogins/all?appId=${appId}&_=${timestamp}`);
        
        if (usersResponse.ok) {
          const response = await usersResponse.json();
          
          // Handle paginated response format
          if (response && response.users) {
            usersData = response.users;
            console.log(`User login API returned ${usersData.length} user records (paginated format)`);
          } else if (Array.isArray(response)) {
            usersData = response;
            console.log(`User login API returned ${usersData.length} user records (array format)`);
          } else {
            console.warn(`User login API returned unexpected format:`, response);
            usersData = [];
          }
        } else {
          console.warn(`User login API returned status ${usersResponse.status}`);
          
          // Try a direct API call without timestamp to see if that works
          try {
            console.log('Trying direct API call without timestamp...');
            const directApiResponse = await fetch(`http://localhost:3010/api/userlogins/all?appId=${appId}`);
            
            if (directApiResponse.ok) {
              const response = await directApiResponse.json();
              
              // Handle paginated response format
              if (response && response.users) {
                usersData = response.users;
                console.log(`Direct API call returned ${usersData.length} user records (paginated format)`);
              } else if (Array.isArray(response)) {
                usersData = response;
                console.log(`Direct API call returned ${usersData.length} user records (array format)`);
              } else {
                console.warn(`Direct API call returned unexpected format:`, response);
                usersData = [];
              }
            } else {
              console.warn(`Direct API call also failed with status ${directApiResponse.status}`);
              usersData = [];
            }
          } catch (directApiError) {
            console.error('Error with direct API call:', directApiError);
            usersData = [];
          }
        }
      } catch (fetchError) {
        console.error('Error fetching users/organizers:', fetchError);
        
        // If we're in development mode, provide fallback demo data
        if (process.env.NODE_ENV === 'development') {
          console.log('Using demo data since backend is unavailable');
          usersData = [
            {
              _id: "1",
              firebaseUserId: "demouser1",
              localUserInfo: { firstName: "John", lastName: "Demo" },
              active: true,
              roleIds: [{_id: "66cb85ac74dca51e34e268ef", roleName: "User"}],
              regionalOrganizerInfo: {}
            },
            {
              _id: "2",
              firebaseUserId: "demouser2",
              localUserInfo: { firstName: "Admin", lastName: "User" },
              active: true,
              roleIds: [{_id: "66cb85ac74dca51e34e268ec", roleName: "SystemAdmin"}],
              regionalOrganizerInfo: {}
            },
            {
              _id: "3",
              firebaseUserId: "demoorganizer",
              localUserInfo: { firstName: "Organizer", lastName: "Demo" },
              active: true,
              roleIds: [{_id: "66cb85ac74dca51e34e268ed", roleName: "RegionalOrganizer"}],
              regionalOrganizerInfo: { organizerId: "123", isActive: true, isApproved: true, isEnabled: true }
            }
          ];
        } else {
          // In production, rethrow to show proper error
          throw fetchError;
        }
      }
      
      console.log(`Received ${usersData.length} users from backend`);
      
      // Debug organizer information
      const usersWithOrganizerInfo = usersData.filter(user => 
        user.regionalOrganizerInfo && user.regionalOrganizerInfo.organizerId
      );
      
      console.log(`Page: Found ${usersWithOrganizerInfo.length} users with organizer connections`);
      
      // Log the first 5 organizer connections in detail
      usersWithOrganizerInfo.slice(0, 5).forEach(user => {
        console.log(`Page: User ${user.firebaseUserId} has organizerId:`, user.regionalOrganizerInfo.organizerId);
        console.log('Full regionalOrganizerInfo:', JSON.stringify(user.regionalOrganizerInfo, null, 2));
      });
      
      // Process users data to add display name and computed fields
      const processedUsers = usersData.map(user => {
        try {
          // Check if this is a MongoDB document or plain object
          const userId = user._id || 'unknown';
          
          // Check if this record came from the organizers collection
          const isOrganizerRecord = user._isOrganizer === true;
          
          // Handle different structures for 'active' property
          // It could be at root level, in isActive, or in localUserInfo.isActive
          const isActiveValue = user.active !== undefined 
            ? user.active 
            : user.isActive !== undefined
              ? user.isActive
              : user.localUserInfo?.isActive !== undefined
                ? user.localUserInfo.isActive
                : user.isActiveAsOrganizer !== undefined
                  ? user.isActiveAsOrganizer
                  : true; // Default to active if we can't find anything
                
          // Always use Firebase display name if available, as requested
          const displayName = user.firebaseUserInfo?.displayName || 
            user.fullName || // Use fullName if available
            `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || // Or build from firstName/lastName
            user.shortName || // Or short name
            user.loginId || // Or login ID
            'Unnamed User'; // Fallback

          // Always use Firebase email if available, as requested
          const email = user.firebaseUserInfo?.email || // First check firebaseUserInfo
            user.publicEmail || // Then publicEmail
            user.loginId ? `${user.loginId}@example.com` : // Use loginId if available
            'No email'; // Fallback
            
          // Handle role names - for organizer records, add "Organizer" role
          let roleNames = '';
          if (isOrganizerRecord) {
            roleNames = 'Organizer';
          } else {
            // Get all role IDs from the user
            const roleIds = (user.roleIds || []).map(role => 
              typeof role === 'object' ? role._id : role
            );
            
            // Simply join the IDs with commas or show "No roles" if empty
            roleNames = roleIds.length > 0 ? roleIds.join(', ') : 'No roles';
            
            // Debug for first few users processed
            if (usersData.indexOf(user) < 5) {
              console.log(`Role IDs for user ${user._id?.substring(0,8) || 'unknown'}:`, roleIds);
            }
          }
          
          // For organizer records, create a synthetic regionalOrganizerInfo
          let regionalOrganizerInfo = user.regionalOrganizerInfo || {};
          if (isOrganizerRecord) {
            regionalOrganizerInfo = {
              organizerId: user._id, // The organizer record itself is the organizerId
              isApproved: user.isEnabled !== false,
              isEnabled: user.isEnabled !== false,
              isActive: user.isActive !== false
            };
          }
          
          // Add some diagnostics
          console.log(`${isOrganizerRecord ? 'Organizer' : 'User'} ${userId}: name=${displayName}, active=${isActiveValue}, source=${isOrganizerRecord ? 'organizers' : 'userLogins'}`);
          
          // Determine if user has organizer profile
          const hasOrganizerProfile = !!(user.regionalOrganizerInfo && user.regionalOrganizerInfo.organizerId);
          
          return {
            ...user, // Keep all original fields
            id: userId, // For DataGrid key
            displayName,
            email,
            roleNames,
            loginUserName: user.localUserInfo?.loginUserName || '',
            isActive: isActiveValue ? 'Active' : 'Inactive',
            // Ensure these objects exist to prevent UI errors
            firebaseUserId: user.firebaseUserId || '', // Make sure firebaseUserId is always a string
            localUserInfo: user.localUserInfo || {},
            regionalOrganizerInfo: user.regionalOrganizerInfo || {},
            localAdminInfo: user.localAdminInfo || {},
            // Add computed flag for user status
            isRealUser: !!user.firebaseUserId && !user.firebaseUserId.startsWith('temp_'),
            isOrganizer: hasOrganizerProfile,
            // All records now come from userlogins collection
            source: 'userLogins' 
          };
        } catch (err) {
          console.error('Error processing user:', err, user);
          
          // Return a minimal valid user object to prevent UI crashes
          return {
            id: user._id || Math.random().toString(36),
            displayName: 'Error Processing User',
            email: 'error@example.com',
            isActive: 'Unknown',
            firebaseUserId: '',
            localUserInfo: {},
            regionalOrganizerInfo: {},
            localAdminInfo: {},
            isRealUser: false,
            isOrganizer: false,
            source: 'error'
          };
        }
      });
      
      setUsers(processedUsers);
      setFilteredUsers(processedUsers);
      setLoading(false);
      
      // Set a short timeout to reapply filters (sometimes needed for UI refresh)
      setTimeout(() => {
        setFilteredUsers(prev => [...prev]); // Force re-render
      }, 100);
      
      return processedUsers; // Return for chaining
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      
      // In development mode, just log the error
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to fetch users: ${error.message}`);
      } else {
        // In production, show alert
        alert(`Failed to fetch users: ${error.message}`);
      }
      
      throw error; // Rethrow for the caller to handle
    }
  };

  // Fetch users and roles on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch roles first - with hardcoded fallback if backend is unreachable
        const rolesData = await rolesApi.getRoles(appId);
        console.log("Roles data loaded:", rolesData);
        
        if (rolesData && rolesData.roles && Array.isArray(rolesData.roles)) {
          console.log("Roles array:", rolesData.roles.map(r => ({id: r._id, code: r.roleNameCode})));
          setRoles(rolesData);
        } else if (Array.isArray(rolesData)) {
          // Handle legacy format where rolesData is directly an array
          console.log("Roles array (legacy format):", rolesData.map(r => ({id: r._id, code: r.roleNameCode})));
          setRoles({ roles: rolesData });
        } else {
          console.error("Error: Roles data is not in expected format:", rolesData);
          setRoles({ roles: [] });
        }
        
        // Manually check the API to diagnose issues
        try {
          console.log("Directly checking the backend API...");
          const directApiResponse = await fetch(`http://localhost:3010/api/userlogins/all?appId=${appId}`);
          const apiData = await directApiResponse.json();
          console.log(`Direct API call returned ${apiData.length} users`);
          
          // Add more detailed logging about the API response
          if (apiData.length > 0) {
            console.log("First 3 user IDs from API:", apiData.slice(0, 3).map(u => u._id));
            console.log("Sample structure of first user:", {
              _id: apiData[0]._id,
              hasFirebaseId: !!apiData[0].firebaseUserId,
              hasLocalInfo: !!apiData[0].localUserInfo,
              fields: Object.keys(apiData[0])
            });
          }
          
          // Also directly call our frontend API for comparison
          const frontendApiResponse = await fetch(`/api/users?appId=${appId}`);
          const frontendData = await frontendApiResponse.json();
          console.log(`Frontend API call returned ${frontendData.length} users`);
        } catch (directError) {
          console.warn("Error making direct API call:", directError);
          // Non-blocking, just for diagnosis
        }
        
        // Then refresh users
        try {
          await refreshUsers();
        } catch (userError) {
          console.error('Error fetching users:', userError);
          setLoading(false);
          
          // Set empty users array instead of showing an error
          // This prevents the UI from crashing
          setUsers([]);
          setFilteredUsers([]);
          
          // Show a warning but don't block the UI
          console.warn('Using demo data because backend is unavailable');
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        setLoading(false);
        
        // Show a more helpful message
        if (error.code === 'ERR_NETWORK') {
          alert(`Backend server appears to be offline. Some functionality will be limited.`);
        } else {
          alert(`Failed to fetch data: ${error.message}`);
        }
      } finally {
        // Always make sure loading is false
        setLoading(false);
      }
    };

    fetchData();
  }, [appId]);

  // Handle tab change
  const handleTabChange = async (event, newValue) => {
    setTabValue(newValue);
    
    try {
      // Refresh data before filtering to ensure we have the latest data
      // Use a timestamp to force cache busting
      await refreshUsers();
      
      // After refreshing, filter users based on tab
      if (newValue === 0) { // All Users
        // No filtering for All Users tab
        filterUsers(searchTerm);
      } else if (newValue === 1) { // Organizers
        console.log("Debugging user records with regionalOrganizerInfo:");
        users.forEach(user => {
          if (user.regionalOrganizerInfo && Object.keys(user.regionalOrganizerInfo).length > 0) {
            console.log(`User ${user.firebaseUserId || user._id}: organizerId=${user.regionalOrganizerInfo.organizerId || 'none'}`);
          }
        });

        // Filter users who have a valid organizerId in their regionalOrganizerInfo
        const organizerUsers = users.filter(user => {
          const hasOrganizerId = user.regionalOrganizerInfo && 
            user.regionalOrganizerInfo.organizerId && 
            user.regionalOrganizerInfo.organizerId !== null &&
            user.regionalOrganizerInfo.organizerId !== undefined;
            
          // Log debugging information for each potential organizer
          if (hasOrganizerId) {
            console.log(`Found organizer: ${user.firebaseUserId}, organizerId: ${
              typeof user.regionalOrganizerInfo.organizerId === 'object' 
              ? user.regionalOrganizerInfo.organizerId._id 
              : user.regionalOrganizerInfo.organizerId
            }`);
          }
          
          return hasOrganizerId;
        });
        
        console.log(`Found ${organizerUsers.length} users with valid organizerId in regionalOrganizerInfo`);
        applySearch(organizerUsers, searchTerm);
      } else if (newValue === 2) { // Admins
        // Consider users as admins if they have admin roles or flags
        const adminUsers = users.filter(user => 
          // Check for admin roles
          (user.roleIds?.some(role => 
            (typeof role === 'object' && 
            (role.roleName === 'SystemAdmin' || role.roleName === 'RegionalAdmin'))
          )) ||
          // Or check for admin flags
          user.isAdmin === true ||
          user.localAdminInfo?.isApproved === true ||
          user.localAdminInfo?.isActive === true
        );
        
        console.log(`Found ${adminUsers.length} admin users`);
        applySearch(adminUsers, searchTerm);
      }
    } catch (error) {
      console.error(`Error refreshing data during tab change:`, error);
    }
  };
  
  // Handle Firebase user synchronization
  const handleSyncFirebaseUsers = async () => {
    try {
      // Get confirmation
      if (!window.confirm('This will synchronize all Firebase users with the database. Continue?')) {
        return;
      }
      
      setLoading(true);
      
      // First check Firebase status to make sure it's available
      let statusResponse;
      try {
        statusResponse = await axios.get('/api/debug/firebase-status');
        
        // If Firebase is not available, show error and instructions
        if (!statusResponse.data.success) {
          const errorMessage = statusResponse.data.status || 'Firebase is not properly configured';
          const helpText = statusResponse.data.possible_causes ? 
            `\n\nPossible causes:\n- ${statusResponse.data.possible_causes.join('\n- ')}` : '';
          
          throw new Error(`${errorMessage}${helpText}`);
        }
        
        console.log('Firebase status check passed:', statusResponse.data);
      } catch (statusError) {
        console.error('Firebase status check failed:', statusError);
        throw new Error(`Unable to verify Firebase availability: ${statusError.message}`);
      }
      
      // Now call the API to import users from Firebase
      const syncResponse = await axios.post('/api/debug/import-firebase-users', { 
        appId,
        forceInit: false // Set to true to force Firebase reinitialization if needed
      });
      
      if (!syncResponse.data.success) {
        const errorDetails = syncResponse.data.details ? 
          `\nDetails: ${syncResponse.data.details}` : '';
        const helpText = syncResponse.data.help ? 
          `\n\nTroubleshooting: ${syncResponse.data.help}` : '';
          
        throw new Error(`${syncResponse.data.error || 'Synchronization failed'}${errorDetails}${helpText}`);
      }
      
      // Show results
      const stats = syncResponse.data.stats;
      const detailedMessage = stats ? 
        `\n\n• Total Firebase users processed: ${stats.total}` +
        `\n• New users created: ${stats.created}` + 
        `\n• Existing users updated: ${stats.updated}` +
        `\n• Users skipped: ${stats.skipped}` +
        `\n• Errors encountered: ${stats.errors}` : '';
      
      alert(`Successfully synchronized users!${detailedMessage}`);
      
      // Refresh the users list
      await refreshUsers();
      
    } catch (error) {
      console.error('Error synchronizing Firebase users:', error);
      
      // Format the error message for better readability
      let errorMessage = 'Error synchronizing users: ';
      
      if (error.response && error.response.data) {
        // API returned a structured error response
        const responseData = error.response.data;
        errorMessage += responseData.error || responseData.message || error.message;
        
        if (responseData.details) {
          errorMessage += `\n\nDetails: ${responseData.details}`;
        }
        
        if (responseData.help) {
          errorMessage += `\n\nTroubleshooting: ${responseData.help}`;
        }
      } else {
        // Standard error
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    filterUsers(term);
  };

  // Filter users based on search term and current tab
  const filterUsers = (term) => {
    console.log(`Filtering ${users.length} users for tab ${tabValue} with search term "${term}"`);
    
    let filtered = users;
    
    // Apply tab filtering
    if (tabValue === 1) { // Organizers
      // Filter to show only users with valid organizerId in regionalOrganizerInfo
      filtered = filtered.filter(user => {
        const hasOrganizerId = user.regionalOrganizerInfo && 
          user.regionalOrganizerInfo.organizerId && 
          user.regionalOrganizerInfo.organizerId !== null &&
          user.regionalOrganizerInfo.organizerId !== undefined;
        
        return hasOrganizerId;
      });
      console.log(`Found ${filtered.length} users matching organizer criteria`);
      
      // Debug: log all filtered organizer users
      if (filtered.length > 0) {
        console.log("Organizers found:");
        filtered.forEach(user => {
          console.log(`  - ${user.firebaseUserId || user._id}: ${user.displayName}, organizerId: ${
            typeof user.regionalOrganizerInfo.organizerId === 'object' 
            ? user.regionalOrganizerInfo.organizerId._id 
            : user.regionalOrganizerInfo.organizerId
          }`);
        });
      }
    } else if (tabValue === 2) { // Admins
      // Include all possible admin indicators
      filtered = filtered.filter(user => 
        // Check for admin roles the standard way
        (user.roleIds?.some(role => 
          (typeof role === 'object' && 
          (role.roleName === 'SystemAdmin' || role.roleName === 'RegionalAdmin'))
        )) ||
        // Or check for admin flags
        user.isAdmin === true ||
        user.localAdminInfo?.isApproved === true ||
        user.localAdminInfo?.isActive === true ||
        // Check if roleNames contains admin roles
        user.roleNames?.includes('SystemAdmin') ||
        user.roleNames?.includes('RegionalAdmin')
      );
      console.log(`Found ${filtered.length} users matching admin criteria`);
    } else {
      // All users tab - no filtering needed
      console.log(`Showing all ${filtered.length} users in All Users tab`);
      
      // Adding a debug count of sources
      const userSourceCount = filtered.reduce((count, user) => {
        const source = user.source || 'unknown';
        count[source] = (count[source] || 0) + 1;
        return count;
      }, {});
      
      console.log('Users by source:', userSourceCount);
    }
    
    // Apply search term filtering
    applySearch(filtered, term);
  };

  // Apply search filter to the provided list
  const applySearch = (userList, term) => {
    if (!term) {
      console.log(`Setting filtered users with ${userList.length} items`);
      setFilteredUsers(userList);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = userList.filter(user => {
      // Safely check each field to avoid errors with undefined values
      try {
        const nameMatch = user.displayName && user.displayName.toLowerCase().includes(lowerTerm);
        const emailMatch = user.email && user.email.toLowerCase().includes(lowerTerm);
        const roleMatch = user.roleNames && user.roleNames.toLowerCase().includes(lowerTerm);
        const idMatch = user.firebaseUserId && user.firebaseUserId.toLowerCase().includes(lowerTerm);
        const fullNameMatch = user.fullName && user.fullName.toLowerCase().includes(lowerTerm);
        
        return nameMatch || emailMatch || roleMatch || idMatch || fullNameMatch;
      } catch (err) {
        console.warn('Error filtering user:', err);
        return false; // Skip items that cause errors
      }
    });
    
    console.log(`Filtered ${userList.length} users down to ${filtered.length} matches for term: ${term}`);
    setFilteredUsers(filtered);
  };

  // Handle edit user button click
  const handleEditUser = (user) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  // Handle user update
  const handleUpdateUser = async (updatedUser) => {
    try {
      setLoading(true);
      
      // Extract role IDs from the updatedUser object
      const roleIds = [...updatedUser.roleIds];
      
      // First update general user information (without roleIds to prevent issues)
      const userUpdateData = {
        firebaseUserId: updatedUser.firebaseUserId,
        appId: updatedUser.appId || appId,
        active: updatedUser.active,
        localUserInfo: updatedUser.localUserInfo,
        regionalOrganizerInfo: updatedUser.regionalOrganizerInfo,
        localAdminInfo: updatedUser.localAdminInfo
      };
      
      console.log('Updating user data:', userUpdateData);
      
      // Update user basic information directly to the backend
      await usersApi.updateUser(userUpdateData);
      
      // Update user roles separately directly to the backend
      console.log('Updating user roles:', roleIds);
      await usersApi.updateUserRoles(updatedUser.firebaseUserId, roleIds, appId);
      
      // Refresh the users list
      await refreshUsers();
      filterUsers(searchTerm);
      setDialogOpen(false);
      setEditingUser(null);
      setLoading(false);
      
      // No success message needed
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Error updating user: ${error.message}`);
      setLoading(false);
    }
  };

  // Handle quick create organizer
  const handleQuickCreateOrganizer = async (user) => {
    try {
      setSelectedUser(user);
      setCreatingOrganizer(true);
      
      // Check if this user has a valid firebase ID (check if it's not a temp ID)
      const isFirebaseUser = !user.firebaseUserId.startsWith('temp_');
      
      // Use the existing user's Firebase ID if available
      const fullName = `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || 'Unnamed Organizer';
      const shortName = user.localUserInfo?.firstName || 'Unnamed';
      
      const organizerData = {
        firebaseUserId: user.firebaseUserId,
        linkedUserLogin: user._id,
        appId: user.appId || '1',
        fullName: fullName,
        name: fullName, // Add name as well to ensure it's displayed in lists
        shortName: shortName,
        organizerRegion: "66c4d99042ec462ea22484bd", // US region default
        isActive: true,
        isEnabled: true,
        wantRender: true,
        organizerTypes: {
          isEventOrganizer: true,
          isVenue: false,
          isTeacher: false,
          isMaestro: false,
          isDJ: false,
          isOrchestra: false
        }
      };
      
      // Create the organizer
      const response = await axios.post(`/api/organizers`, organizerData);
      
      console.log("Organizer created:", response.data);
      
      // Update user to include organizerId reference and organizer role
      const userUpdateData = {
        firebaseUserId: user.firebaseUserId,
        appId: user.appId || '1',
        regionalOrganizerInfo: {
          ...user.regionalOrganizerInfo,
          organizerId: response.data.organizer._id || response.data._id,
          isApproved: true,
          isEnabled: true,
          isActive: true
        }
      };
      
      // Update user
      await usersApi.updateUser(userUpdateData);
      
      // Find organizer role
      const organizerRole = roles.find(role => role.roleName === 'RegionalOrganizer');
      if (organizerRole) {
        const roleIds = [...(user.roleIds || [])];
        const roleObjectIds = roleIds.map(role => 
          typeof role === 'object' ? role._id : role
        );
        
        // Add organizer role if not already present
        if (!roleObjectIds.includes(organizerRole._id)) {
          roleObjectIds.push(organizerRole._id);
          await usersApi.updateUserRoles(user.firebaseUserId, roleObjectIds, user.appId || '1');
        }
      }
      
      // Set a delay to ensure backend updates are processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force a full refresh of the user data with an anti-cache parameter
      const timestamp = new Date().getTime();
      const refreshedUsers = await usersApi.getUsers(appId, undefined, timestamp);
      
      // Process users data
      const processedUsers = refreshedUsers.map(user => ({
        ...user,
        id: user._id,
        displayName: `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || 'Unnamed User',
        email: user.firebaseUserInfo?.email || 'No email',
        roleNames: (user.roleIds || [])
          .map(role => typeof role === 'object' ? role.roleName : 'Unknown')
          .join(', '),
        isActive: user.active ? 'Active' : 'Inactive',
        isOrganizer: user.regionalOrganizerInfo?.organizerId ? 'Yes' : 'No',
        tempFirebaseId: user.firebaseUserId || '',
      }));
      
      setUsers(processedUsers);
      filterUsers(searchTerm);
    } catch (error) {
      console.error("Error creating organizer:", error);
      
      let errorMessage = 'Failed to create organizer';
      if (error.response && error.response.data) {
        errorMessage += `: ${error.response.data.message || JSON.stringify(error.response.data)}`;
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setCreatingOrganizer(false);
      setSelectedUser(null);
    }
  };

  // Handle delete organizer
  const handleDeleteOrganizer = async (user) => {
    try {
      if (!user.regionalOrganizerInfo?.organizerId) {
        alert('This user does not have an organizer to delete.');
        return;
      }

      // Get confirmation
      if (!window.confirm(`Are you sure you want to delete the organizer associated with ${user.displayName}?\nThis action cannot be undone.`)) {
        return;
      }

      setSelectedUser(user);
      setLoading(true);

      // First, disconnect the organizer from the user
      const userUpdateData = {
        firebaseUserId: user.firebaseUserId,
        appId: user.appId || '1',
        regionalOrganizerInfo: {
          ...user.regionalOrganizerInfo,
          organizerId: null, // Remove the organizer reference
          isApproved: false,
          isEnabled: false,
          isActive: false
        }
      };

      // Update user to remove organizer connection
      await usersApi.updateUser(userUpdateData);

      // Now delete the organizer
      let organizerId = user.regionalOrganizerInfo.organizerId;
      if (typeof organizerId === 'object') {
        // Handle the case where organizerId is an object with _id
        organizerId = organizerId._id;
      }

      // Delete the organizer
      await axios.delete(`${process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3010'}/api/organizers/${organizerId}?appId=${user.appId || '1'}`);

      // Refresh users
      await refreshUsers();
      filterUsers(searchTerm);

      alert('Organizer deleted successfully!');
    } catch (error) {
      console.error("Error deleting organizer:", error);
      
      let errorMessage = 'Failed to delete organizer';
      if (error.response && error.response.data) {
        errorMessage += `: ${error.response.data.message || JSON.stringify(error.response.data)}`;
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
      setSelectedUser(null);
    }
  };
  
  // Handle delete user with proper organizer relationship cleanup
  const handleDeleteUser = async (user) => {
    try {
      // Get confirmation with clear warning
      let confirmMessage = `Are you sure you want to delete user "${user.displayName}"?`;
      confirmMessage += "\n\nWARNING: This will permanently remove this user and they will no longer be able to log in.";
      
      // Check if user is linked to an organizer
      const hasOrganizer = user.regionalOrganizerInfo?.organizerId;
      if (hasOrganizer) {
        confirmMessage += "\n\nIMPORTANT: This user is linked to an organizer. The organizer will NOT be deleted, but will have its user connection removed.";
        confirmMessage += "\nThe organizer will need to be reassigned to another user or it will become inaccessible.";
      }
      
      confirmMessage += "\n\nThis action cannot be undone.";
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      setSelectedUser(user);
      setLoading(true);
      
      // If user has an organizer connection, first remove that connection to prevent orphaned references
      if (hasOrganizer) {
        try {
          console.log(`User has organizer connection. Updating organizer before deleting user...`);
          
          // Get the organizer ID (handling both string and object formats)
          const organizerId = typeof user.regionalOrganizerInfo.organizerId === 'object'
            ? user.regionalOrganizerInfo.organizerId._id
            : user.regionalOrganizerInfo.organizerId;
          
          // Update the organizer to remove user references
          await axios.patch(`/api/organizers/${organizerId}`, {
            firebaseUserId: null,
            linkedUserLogin: null,
            appId: user.appId || '1'
          });
          
          console.log(`Successfully disconnected user from organizer ${organizerId}`);
        } catch (organizerError) {
          console.error('Error disconnecting user from organizer:', organizerError);
          // Continue with user deletion even if organizer update fails
        }
      }

      // Delete the user
      await usersApi.deleteUser(user._id, user.appId || '1');

      // Refresh the user list
      await refreshUsers();
      filterUsers(searchTerm);

      alert('User deleted successfully!');
    } catch (error) {
      console.error("Error deleting user:", error);
      
      let errorMessage = 'Failed to delete user';
      if (error.response && error.response.data) {
        errorMessage += `: ${error.response.data.message || JSON.stringify(error.response.data)}`;
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
      setSelectedUser(null);
    }
  };
  
  
  // Handle create new user
  const handleCreateUser = async () => {
    try {
      // Basic validation - Just need email and names for direct backend creation
      if (!newUser.email || !newUser.firstName || !newUser.lastName) {
        alert('Please fill in all required fields (Email, First name, Last name)');
        return;
      }
      
      // Password validation only if we're using it
      if (newUser.password && newUser.password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      
      // Set loading state
      setLoading(true);
      
      // Log what we're attempting to do
      console.log(`Creating new user: ${newUser.email} (${newUser.firstName} ${newUser.lastName})`);
      
      // Confirm that the user understands temp users
      if (!newUser.password || newUser.password.length === 0) {
        const confirm = window.confirm("You are creating a temporary user without Firebase authentication. This user won't be able to log in. Continue?");
        if (!confirm) {
          setLoading(false);
          return;
        }
      }
      
      // 1. Create user - direct backend call
      try {
        // Create user data
        const userData = {
          email: newUser.email,
          password: newUser.password || '', // Password is optional, will create temp user if missing
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          appId: appId,
          active: newUser.active
        };
        
        // Make the API call directly to our backend
        console.log('Sending user data to API:', userData);
        const response = await axios.post('/api/users', userData);
        console.log('User created response:', response.data);
        
        if (!response.data) {
          throw new Error('No data returned from user creation API');
        }
        
        // Get the newly created user data 
        const createdUser = response.data;
        
        // If the user requested to create an organizer, do that now
        if (newUser.isOrganizer && createdUser.firebaseUserId) {
          try {
            // Prepare organizer data
            const organizerData = {
              firebaseUserId: createdUser.firebaseUserId,
              linkedUserLogin: createdUser._id,
              appId: appId,
              fullName: `${newUser.firstName} ${newUser.lastName}`.trim(),
              shortName: newUser.firstName,
              organizerRegion: "66c4d99042ec462ea22484bd", // US region default
              isActive: true,
              isEnabled: true,
              wantRender: true,
              organizerTypes: {
                isEventOrganizer: true,
                isVenue: false,
                isTeacher: false,
                isMaestro: false,
                isDJ: false,
                isOrchestra: false
              }
            };
            
            console.log('Creating organizer for new user with data:', organizerData);
            
            // Create the organizer
            const organizerResponse = await axios.post('/api/organizers', organizerData);
            console.log("Organizer created:", organizerResponse.data);
            
            // Update user to include organizerId reference
            const userUpdateData = {
              firebaseUserId: createdUser.firebaseUserId,
              appId: appId,
              regionalOrganizerInfo: {
                organizerId: organizerResponse.data._id,
                isApproved: true,
                isEnabled: true,
                isActive: true
              }
            };
            
            // Update user with organizer reference
            await usersApi.updateUser(userUpdateData);
            
            // Add organizer role to the user
            const organizerRole = roles.find(role => role.roleName === 'RegionalOrganizer');
            if (organizerRole) {
              await usersApi.updateUserRoles(createdUser.firebaseUserId, [organizerRole._id], appId);
            }
          } catch (organizerError) {
            console.error("Error creating organizer for new user:", organizerError);
            
            // Still continue since the user was created successfully
            alert(`User created, but could not create organizer: ${organizerError.message}`);
          }
        }
        
        // Refresh the user list with a cache-busting parameter
        console.log('Refreshing users after creation...');
        await refreshUsers();
        filterUsers(searchTerm);
        
        // Reset form and close dialog
        setNewUser({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          active: true,
          isOrganizer: false,
        });
        setAddUserDialogOpen(false);
        
        // No success message needed
      } catch (directError) {
        console.error('Direct backend creation failed:', directError);
        throw directError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error("Error creating user:", error);
      
      let errorMessage = 'Failed to create user';
      if (error.response) {
        console.error('Error response:', error.response);
        if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
          errorMessage += ': Server error - check the console for details';
        } else if (error.response.data && error.response.data.message) {
          errorMessage += `: ${error.response.data.message}`;
        } else {
          errorMessage += `: ${error.message}`;
        }
      } else {
        errorMessage += `: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Define columns for All Users tab
  const allUsersColumns = [
    { 
      field: 'displayName', 
      headerName: 'Name', 
      flex: 1,
      renderCell: (params) => {
        // Always use Firebase displayName if available
        return <span>{params.row.firebaseUserInfo?.displayName || params.row.displayName}</span>;
      }
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      renderCell: (params) => {
        // Always use Firebase email if available
        return <span>{params.row.firebaseUserInfo?.email || params.row.email}</span>;
      }
    },
    { field: 'firebaseUserId', headerName: 'Firebase ID', flex: 1 },
    { 
      field: 'roleNames', 
      headerName: 'Roles', 
      flex: 1 
    },
    { 
      field: 'userType',
      headerName: 'Type', 
      width: 120,
      renderCell: (params) => {
        const user = params.row;
        if (user.isOrganizer) return <span>Organizer</span>;
        if (user.isRealUser) return <span>User</span>;
        return <span>Unknown</span>;
      }
    },
    { 
      field: 'localUserApproved', 
      headerName: 'Approved', 
      width: 100,
      renderCell: (params) => {
        const isApproved = 
          params.row?.localUserInfo?.isApproved ||  // Check in localUserInfo
          params.row?.isApproved ||                 // Check at root level
          params.row?.regionalOrganizerInfo?.isApproved; // Check in organizer info
        return <span>{isApproved ? 'Yes' : 'No'}</span>;
      }
    },
    { 
      field: 'localUserEnabled', 
      headerName: 'Enabled', 
      width: 100,
      renderCell: (params) => {
        const isEnabled = 
          params.row?.localUserInfo?.isEnabled ||   // Check in localUserInfo
          params.row?.isEnabled ||                  // Check at root level
          params.row?.regionalOrganizerInfo?.isEnabled; // Check in organizer info
        return <span>{isEnabled ? 'Yes' : 'No'}</span>;
      }
    },
    { field: 'isActive', headerName: 'Active', width: 100 },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 150,
      renderCell: (params) => {
        const user = params.row;
        const isDeleting = loading && selectedUser?._id === user._id;
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="text"
              color="primary"
              onClick={() => handleEditUser(user)}
              startIcon={<EditIcon />}
              size="small"
            >
              Edit
            </Button>
            
            <Button
              variant="text"
              color="error"
              onClick={() => handleDeleteUser(user)}
              startIcon={<DeleteIcon />}
              disabled={isDeleting}
              size="small"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
        );
      }
    },
  ];
  
  // Define columns for Organizer tab
  const organizerColumns = [
    { 
      field: 'displayName', 
      headerName: 'Name', 
      flex: 1,
      renderCell: (params) => {
        // Always use Firebase displayName if available
        return <span>{params.row.firebaseUserInfo?.displayName || params.row.displayName}</span>;
      }
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      renderCell: (params) => {
        // Always use Firebase email if available
        return <span>{params.row.firebaseUserInfo?.email || params.row.email}</span>;
      }
    },
    { field: 'firebaseUserId', headerName: 'Firebase ID', width: 180 },
    { 
      field: 'organizerId', 
      headerName: 'Organizer ID',
      flex: 1,
      renderCell: (params) => {
        // Check multiple possible places for organizerId
        const orgId = 
          params.row?.regionalOrganizerInfo?.organizerId || // Standard place
          params.row?._id; // For pure organizer records that don't have the nested structure
          
        return <span>{typeof orgId === 'object' ? orgId?._id : orgId}</span>;
      }
    },
    { 
      field: 'organizerType',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => {
        const user = params.row;
        const types = [];
        
        // Check organizer types in various locations
        const organizerTypes = user.organizerTypes || {};
        
        if (organizerTypes.isEventOrganizer) types.push('Event');
        if (organizerTypes.isVenue) types.push('Venue');
        if (organizerTypes.isTeacher) types.push('Teacher');
        if (organizerTypes.isMaestro) types.push('Maestro');
        if (organizerTypes.isDJ) types.push('DJ');
        if (organizerTypes.isOrchestra) types.push('Orchestra');
        
        return <span>{types.length > 0 ? types.join(', ') : 'General'}</span>;
      }
    },
    { 
      field: 'regionalApproved', 
      headerName: 'Approved', 
      width: 100,
      renderCell: (params) => {
        const isApproved = 
          params.row?.regionalOrganizerInfo?.isApproved || // Check in regional info
          params.row?.isApproved; // Check at root level for pure organizer records
          
        return <span>{isApproved ? 'Yes' : 'No'}</span>;
      }
    },
    { 
      field: 'regionalEnabled', 
      headerName: 'Enabled', 
      width: 100,
      renderCell: (params) => {
        const isEnabled = 
          params.row?.regionalOrganizerInfo?.isEnabled || // Check in regional info 
          params.row?.isEnabled; // Check at root level for pure organizer records
          
        return <span>{isEnabled ? 'Yes' : 'No'}</span>;
      }
    },
    { 
      field: 'regionalActive', 
      headerName: 'Active', 
      width: 100,
      renderCell: (params) => {
        const isActive = 
          params.row?.regionalOrganizerInfo?.isActive || // Check in regional info
          params.row?.isActive || // Check at root level 
          params.row?.isActiveAsOrganizer; // Check alternate field name
          
        return <span>{isActive ? 'Yes' : 'No'}</span>;
      }
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 150,
      renderCell: (params) => {
        const user = params.row;
        const isDeleting = loading && selectedUser?._id === user._id;
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="text"
              color="primary"
              onClick={() => handleEditUser(user)}
              startIcon={<EditIcon />}
              size="small"
            >
              Edit
            </Button>
            
            <Button
              variant="text"
              color="error"
              onClick={() => handleDeleteUser(user)}
              startIcon={<DeleteIcon />}
              disabled={isDeleting}
              size="small"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
        );
      }
    },
  ];
  
  // Define columns for Admin tab
  const adminColumns = [
    { 
      field: 'displayName', 
      headerName: 'Name', 
      flex: 1,
      renderCell: (params) => {
        // Always use Firebase displayName if available
        return <span>{params.row.firebaseUserInfo?.displayName || params.row.displayName}</span>;
      }
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      renderCell: (params) => {
        // Always use Firebase email if available
        return <span>{params.row.firebaseUserInfo?.email || params.row.email}</span>;
      }
    },
    { field: 'firebaseUserId', headerName: 'Firebase ID', width: 180 },
    { 
      field: 'adminType',
      headerName: 'Admin Type',
      width: 130,
      renderCell: (params) => {
        const user = params.row;
        const roles = user.roleIds || [];
        
        // Just use the role IDs directly, no need for codes
        const roleIds = roles.map(role => 
          typeof role === 'object' ? role._id : role
        );
        
        // Display SA as System Admin, RA as Regional Admin
        if (roleNameCodes.includes('SA')) return <span>System Admin</span>;
        if (roleNameCodes.includes('RA')) return <span>Regional Admin</span>;
        
        return <span>-</span>;
      }
    },
    { 
      field: 'adminApproved', 
      headerName: 'Admin Approved', 
      width: 130,
      renderCell: (params) => {
        const isApproved = 
          params.row?.localAdminInfo?.isApproved || // Check in localAdminInfo
          params.row?.isAdmin || // Check if isAdmin is true at root
          params.row?.isApproved; // Fallback to root isApproved
        
        return <span>{isApproved ? 'Yes' : 'No'}</span>;
      }
    },
    { 
      field: 'adminEnabled', 
      headerName: 'Admin Enabled', 
      width: 130,
      renderCell: (params) => {
        const isEnabled = 
          params.row?.localAdminInfo?.isEnabled || // Check in localAdminInfo
          params.row?.isEnabled; // Fallback to root isEnabled
        
        return <span>{isEnabled ? 'Yes' : 'No'}</span>;
      }
    },
    { 
      field: 'adminActive', 
      headerName: 'Admin Active', 
      width: 130,
      renderCell: (params) => {
        const isActive = 
          params.row?.localAdminInfo?.isActive || // Check in localAdminInfo
          params.row?.isActive || // Fallback to root isActive
          params.row?.active; // Fallback to legacy active property
        
        return <span>{isActive ? 'Yes' : 'No'}</span>;
      }
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 150,
      renderCell: (params) => {
        const user = params.row;
        const isDeleting = loading && selectedUser?._id === user._id;
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="text"
              color="primary"
              onClick={() => handleEditUser(user)}
              startIcon={<EditIcon />}
              size="small"
            >
              Edit
            </Button>
            
            <Button
              variant="text"
              color="error"
              onClick={() => handleDeleteUser(user)}
              startIcon={<DeleteIcon />}
              disabled={isDeleting}
              size="small"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Box>
        );
      }
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PersonAddIcon />}
          onClick={() => setAddUserDialogOpen(true)}
        >
          Add User
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Users" />
          <Tab label="Organizers" />
          <Tab label="Admins" />
        </Tabs>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => handleSyncFirebaseUsers()}
          >
            Sync Firebase Users
          </Button>
          
          <TextField
            placeholder="Search users..."
            value={searchTerm}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredUsers}
              columns={allUsersColumns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              density="standard"
            />
          )}
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredUsers}
              columns={organizerColumns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              density="standard"
            />
          )}
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredUsers}
              columns={adminColumns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              density="standard"
            />
          )}
        </Paper>
      </TabPanel>
      
      {/* User Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editingUser && roles.length > 0 && (
            <UserEditForm
              user={editingUser}
              roles={roles}
              onSubmit={handleUpdateUser}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog
        open={addUserDialogOpen}
        onClose={() => setAddUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="First Name"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Last Name"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  helperText="Optional. If provided, minimum 6 characters. Empty = create temporary user."
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newUser.active}
                      onChange={(e) => setNewUser({...newUser, active: e.target.checked})}
                    />
                  }
                  label="User is Active"
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={newUser.isOrganizer}
                      onChange={(e) => setNewUser({...newUser, isOrganizer: e.target.checked})}
                    />
                  }
                  label="Create Organizer for this User"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleCreateUser}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}