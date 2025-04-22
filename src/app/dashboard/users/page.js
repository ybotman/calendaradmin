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
  Grid,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/Add';
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    active: true,
    isOrganizer: false,
  });

  // Backend API base URL from environment
  const BE_URL = process.env.NEXT_PUBLIC_BE_URL;

  // Helper function to convert role IDs to role codes
  const getRoleCodeForId = (roleId) => {
    try {
      if (!roles?.roles || !Array.isArray(roles.roles) || roles.roles.length === 0) {
        return '';
      }
      
      // Convert roleId to string for safer comparison
      const roleIdStr = roleId?.toString();
      
      // Find role by comparing string versions of IDs
      const role = roles.roles.find(r => 
        r._id?.toString() === roleIdStr || 
        r.id?.toString() === roleIdStr
      );
      
      return role?.roleNameCode || '?';
    } catch (error) {
      console.error('Error in getRoleCodeForId:', error);
      return '?';
    }
  };
  
  // Function to refresh users
  const refreshUsers = async () => {
    try {
      setLoading(true);
      
      // Add a small delay to ensure backend has time to process any updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use timestamp to force fresh data
      const timestamp = new Date().getTime() + Math.floor(Math.random() * 1000);
      
      let usersData = [];
      
      try {
        console.log('Fetching user login records...');
        const usersResponse = await fetch(`${BE_URL}/api/userlogins/all?appId=${appId}&_=${timestamp}`);
        
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
          usersData = [];
        }
      } catch (fetchError) {
        console.error('Error fetching users:', fetchError);
        usersData = [];
      }
      
      console.log(`Received ${usersData.length} users from backend`);
      
      // Process users data to add display name and computed fields
      const processedUsers = usersData.map(user => {
        try {
          const userId = user._id || 'unknown';
          const isOrganizerRecord = user._isOrganizer === true;
          
          // Handle active/inactive status
          const isActiveValue = user.active !== undefined 
            ? user.active 
            : user.isActive !== undefined
              ? user.isActive
              : user.localUserInfo?.isActive !== undefined
                ? user.localUserInfo.isActive
                : user.isActiveAsOrganizer !== undefined
                  ? user.isActiveAsOrganizer
                  : false;
                
          // Use Firebase display name if available
          const displayName = user.firebaseUserInfo?.displayName || 
            user.fullName || 
            `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || 
            user.shortName || 
            user.loginId || 
            '';

          // Use Firebase email if available
          const email = user.firebaseUserInfo?.email || 
            user.publicEmail || 
            user.loginId ? `${user.loginId}@example.com` : 
            '';
            
          // Handle role name codes
          let roleNameCodes = '';
          if (isOrganizerRecord) {
            roleNameCodes = 'RO'; // Organizer role code
          } else {
            // Get all role IDs from the user
            const roleIds = (user.roleIds || []).map(role => 
              typeof role === 'object' ? role._id : role
            );
            
            // Convert roleIds to roleNameCodes
            if (roleIds.length === 0) {
              roleNameCodes = ''; // Empty string if no roles
            } else {
              const roleCodes = roleIds.map(roleId => {
                const code = getRoleCodeForId(roleId);
                return code || '?'; // Use ? for any unrecognized role IDs
              });
              roleNameCodes = roleCodes.join(', ');
            }
          }
          
          // For organizer records, create a regionalOrganizerInfo
          let regionalOrganizerInfo = user.regionalOrganizerInfo || {};
          if (isOrganizerRecord) {
            regionalOrganizerInfo = {
              organizerId: user._id,
              isApproved: user.isEnabled !== false,
              isEnabled: user.isEnabled !== false,
              isActive: user.isActive !== false
            };
          }
          
          // Determine if user has organizer profile
          const hasOrganizerProfile = !!(user.regionalOrganizerInfo && user.regionalOrganizerInfo.organizerId);
          
          return {
            ...user, // Keep all original fields
            id: userId, // For DataGrid key
            displayName,
            email,
            roleNameCodes,
            loginUserName: user.localUserInfo?.loginUserName || '',
            isActive: isActiveValue ? 'Active' : 'Inactive',
            firebaseUserId: user.firebaseUserId || '',
            localUserInfo: user.localUserInfo || {},
            regionalOrganizerInfo: user.regionalOrganizerInfo || {},
            localAdminInfo: user.localAdminInfo || {},
            isRealUser: !!user.firebaseUserId && !user.firebaseUserId.startsWith('temp_'),
            isOrganizer: hasOrganizerProfile,
            source: 'userLogins'
          };
        } catch (err) {
          console.error('Error processing user:', err, user);
          
          // Return a minimal valid user object to prevent UI crashes
          return {
            id: user._id || Math.random().toString(36),
            displayName: '',
            email: '',
            isActive: '',
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
      
      // Set a short timeout to reapply filters
      setTimeout(() => {
        setFilteredUsers(prev => [...prev]); // Force re-render
      }, 100);
      
      return processedUsers; // Return for chaining
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      setUsers([]);
      setFilteredUsers([]);
      throw error;
    }
  };

  // Fetch roles on component mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        
        // Fetch roles first
        const rolesData = await rolesApi.getRoles(appId);
        console.log("Roles data loaded:", rolesData);
        
        if (rolesData && rolesData.roles && Array.isArray(rolesData.roles)) {
          console.log("Roles array:", rolesData.roles.map(r => ({id: r._id, code: r.roleNameCode})));
          setRoles(rolesData);
        } else if (Array.isArray(rolesData)) {
          console.log("Roles array (legacy format):", rolesData.map(r => ({id: r._id, code: r.roleNameCode})));
          setRoles({ roles: rolesData });
        } else {
          console.error("Error: Roles data is not in expected format:", rolesData);
          setRoles({ roles: [] });
        }
      } catch (error) {
        console.error('Error loading roles data:', error);
        setRoles({ roles: [] });
      }
    };

    fetchRoles();
  }, [appId]);
  
  // Fetch users after roles are loaded
  useEffect(() => {
    const fetchUsers = async () => {
      if (!roles?.roles || !Array.isArray(roles.roles)) {
        // Roles not loaded yet, skip user processing
        return;
      }
      
      try {
        setLoading(true);
        // Now that roles are loaded, fetch and process users
        await refreshUsers();
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
        setFilteredUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [roles]); // Run when roles changes

  // Handle tab change
  const handleTabChange = async (event, newValue) => {
    setTabValue(newValue);
    
    try {
      // Refresh data before filtering to ensure we have the latest data
      await refreshUsers();
      
      // After refreshing, filter users based on tab
      if (newValue === 0) { // All Users
        // No filtering for All Users tab
        filterUsers(searchTerm);
      } else if (newValue === 1) { // Organizers
        // Filter users who have a valid organizerId in their regionalOrganizerInfo
        const organizerUsers = users.filter(user => {
          const hasOrganizerId = user.regionalOrganizerInfo && 
            user.regionalOrganizerInfo.organizerId && 
            user.regionalOrganizerInfo.organizerId !== null &&
            user.regionalOrganizerInfo.organizerId !== undefined;
          
          return hasOrganizerId;
        });
        
        applySearch(organizerUsers, searchTerm);
      } else if (newValue === 2) { // Admins
        // Consider users as admins if they have admin role codes
        const adminUsers = users.filter(user => {
          const roleCodes = user.roleNameCodes?.split(', ') || [];
          return roleCodes.includes('SA') || roleCodes.includes('RA');
        });
        
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
    } else if (tabValue === 2) { // Admins
      // Filter admin users by role code
      filtered = filtered.filter(user => {
        const roleCodes = user.roleNameCodes?.split(', ') || [];
        return roleCodes.includes('SA') || roleCodes.includes('RA');
      });
    }
    
    // Apply search term filtering
    applySearch(filtered, term);
  };

  // Apply search filter to the provided list
  const applySearch = (userList, term) => {
    if (!term) {
      setFilteredUsers(userList);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = userList.filter(user => {
      try {
        const nameMatch = user.displayName && user.displayName.toLowerCase().includes(lowerTerm);
        const emailMatch = user.email && user.email.toLowerCase().includes(lowerTerm);
        const roleMatch = user.roleNameCodes && user.roleNameCodes.toLowerCase().includes(lowerTerm);
        const idMatch = user.firebaseUserId && user.firebaseUserId.toLowerCase().includes(lowerTerm);
        const fullNameMatch = user.fullName && user.fullName.toLowerCase().includes(lowerTerm);
        
        return nameMatch || emailMatch || roleMatch || idMatch || fullNameMatch;
      } catch (err) {
        console.warn('Error filtering user:', err);
        return false;
      }
    });
    
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
      
      // Update user basic information
      await usersApi.updateUser(userUpdateData);
      
      // Update user roles separately
      await usersApi.updateUserRoles(updatedUser.firebaseUserId, roleIds, appId);
      
      // Refresh the users list
      await refreshUsers();
      filterUsers(searchTerm);
      setDialogOpen(false);
      setEditingUser(null);
      setLoading(false);
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Error updating user: ${error.message}`);
      setLoading(false);
    }
  };
  
  // Handle delete user
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
            appId: user.appId || appId
          });
          
          console.log(`Successfully disconnected user from organizer ${organizerId}`);
        } catch (organizerError) {
          console.error('Error disconnecting user from organizer:', organizerError);
          // Continue with user deletion even if organizer update fails
        }
      }

      // Delete the user
      await usersApi.deleteUser(user._id, user.appId || appId);

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
      // Basic validation
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
      
      // Confirm that the user understands temp users
      if (!newUser.password || newUser.password.length === 0) {
        const confirm = window.confirm("You are creating a temporary user without Firebase authentication. This user won't be able to log in. Continue?");
        if (!confirm) {
          setLoading(false);
          return;
        }
      }
      
      // Create user data
      const userData = {
        email: newUser.email,
        password: newUser.password || '',
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        appId: appId,
        active: newUser.active
      };
      
      // Make the API call
      const response = await axios.post('/api/users', userData);
      
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
          
          // Create the organizer
          const organizerResponse = await axios.post('/api/organizers', organizerData);
          
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
          const organizerRole = roles.roles.find(role => role.roleNameCode === 'RO');
          if (organizerRole) {
            await usersApi.updateUserRoles(createdUser.firebaseUserId, [organizerRole._id], appId);
          }
        } catch (organizerError) {
          console.error("Error creating organizer for new user:", organizerError);
          alert(`User created, but could not create organizer: ${organizerError.message}`);
        }
      }
      
      // Refresh the user list
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
    } catch (error) {
      console.error("Error creating user:", error);
      
      let errorMessage = 'Failed to create user';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage += `: ${error.response.data.message}`;
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
        return <span>{params.row.firebaseUserInfo?.displayName || params.row.displayName}</span>;
      }
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      renderCell: (params) => {
        return <span>{params.row.firebaseUserInfo?.email || params.row.email}</span>;
      }
    },
    { field: 'firebaseUserId', headerName: 'Firebase ID', flex: 1 },
    { field: 'roleNameCodes', headerName: 'Roles', flex: 1 },
    { 
      field: 'userType',
      headerName: 'Type', 
      width: 120,
      renderCell: (params) => {
        const user = params.row;
        if (user.isOrganizer) return <span>Organizer</span>;
        if (user.isRealUser) return <span>User</span>;
        return <span></span>;
      }
    },
    { 
      field: 'localUserApproved', 
      headerName: 'Approved', 
      width: 100,
      renderCell: (params) => {
        const isApproved = 
          params.row?.localUserInfo?.isApproved || 
          params.row?.isApproved || 
          params.row?.regionalOrganizerInfo?.isApproved;
        return <span>{isApproved ? 'Yes' : ''}</span>;
      }
    },
    { 
      field: 'localUserEnabled', 
      headerName: 'Enabled', 
      width: 100,
      renderCell: (params) => {
        const isEnabled = 
          params.row?.localUserInfo?.isEnabled || 
          params.row?.isEnabled || 
          params.row?.regionalOrganizerInfo?.isEnabled;
        return <span>{isEnabled ? 'Yes' : ''}</span>;
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
        return <span>{params.row.firebaseUserInfo?.displayName || params.row.displayName}</span>;
      }
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      renderCell: (params) => {
        return <span>{params.row.firebaseUserInfo?.email || params.row.email}</span>;
      }
    },
    { field: 'firebaseUserId', headerName: 'Firebase ID', width: 180 },
    { 
      field: 'organizerId', 
      headerName: 'Organizer ID',
      flex: 1,
      renderCell: (params) => {
        const orgId = 
          params.row?.regionalOrganizerInfo?.organizerId || 
          params.row?._id;
          
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
          params.row?.regionalOrganizerInfo?.isApproved ||
          params.row?.isApproved;
          
        return <span>{isApproved ? 'Yes' : ''}</span>;
      }
    },
    { 
      field: 'regionalEnabled', 
      headerName: 'Enabled', 
      width: 100,
      renderCell: (params) => {
        const isEnabled = 
          params.row?.regionalOrganizerInfo?.isEnabled || 
          params.row?.isEnabled;
          
        return <span>{isEnabled ? 'Yes' : ''}</span>;
      }
    },
    { 
      field: 'regionalActive', 
      headerName: 'Active', 
      width: 100,
      renderCell: (params) => {
        const isActive = 
          params.row?.regionalOrganizerInfo?.isActive ||
          params.row?.isActive ||
          params.row?.isActiveAsOrganizer;
          
        return <span>{isActive ? 'Yes' : ''}</span>;
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
        return <span>{params.row.firebaseUserInfo?.displayName || params.row.displayName}</span>;
      }
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      flex: 1,
      renderCell: (params) => {
        return <span>{params.row.firebaseUserInfo?.email || params.row.email}</span>;
      }
    },
    { field: 'firebaseUserId', headerName: 'Firebase ID', width: 180 },
    { 
      field: 'adminType',
      headerName: 'Admin Type',
      width: 130,
      renderCell: (params) => {
        const roleCodes = params.row.roleNameCodes?.split(', ') || [];
        
        if (roleCodes.includes('SA')) return <span>System Admin</span>;
        if (roleCodes.includes('RA')) return <span>Regional Admin</span>;
        
        return <span></span>;
      }
    },
    { 
      field: 'adminApproved', 
      headerName: 'Admin Approved', 
      width: 130,
      renderCell: (params) => {
        const isApproved = 
          params.row?.localAdminInfo?.isApproved || 
          params.row?.isAdmin || 
          params.row?.isApproved;
        
        return <span>{isApproved ? 'Yes' : ''}</span>;
      }
    },
    { 
      field: 'adminEnabled', 
      headerName: 'Admin Enabled', 
      width: 130,
      renderCell: (params) => {
        const isEnabled = 
          params.row?.localAdminInfo?.isEnabled || 
          params.row?.isEnabled;
        
        return <span>{isEnabled ? 'Yes' : ''}</span>;
      }
    },
    { 
      field: 'adminActive', 
      headerName: 'Admin Active', 
      width: 130,
      renderCell: (params) => {
        const isActive = 
          params.row?.localAdminInfo?.isActive || 
          params.row?.isActive || 
          params.row?.active;
        
        return <span>{isActive ? 'Yes' : ''}</span>;
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
          {editingUser && roles.roles && (
            <UserEditForm
              user={editingUser}
              roles={roles.roles}
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