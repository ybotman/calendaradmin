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
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [appId, setAppId] = useState('1'); // Default to TangoTiempo
  const [editingUser, setEditingUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [creatingOrganizer, setCreatingOrganizer] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // Add pagination state
  const [pagination, setPagination] = useState({
    page: 0,
    pageSize: 10,
    totalCount: 0
  });
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    active: true,
    isOrganizer: false,
  });

  // Function to refresh users with enhanced error handling and retry logic
  const refreshUsers = async (currentRoles = [], retryCount = 0) => {
    try {
      setLoading(true);
      
      // Use timestamp to force fresh data
      const timestamp = new Date().getTime();
      
      // Fetch users directly from the backend with cache busting
      let usersData;
      try {
        usersData = await usersApi.getUsers(appId, undefined, timestamp);
        console.log(`Successfully fetched ${usersData.length} users`);
      } catch (fetchError) {
        // Implement retry logic for transient network issues
        if (retryCount < 2) { // Allow up to 2 retries (3 attempts total)
          console.warn(`Error fetching users, retrying (attempt ${retryCount + 1}/3)...`, fetchError);
          // Exponential backoff: 1s, then 2s
          const delay = 1000 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return refreshUsers(currentRoles, retryCount + 1);
        }
        throw fetchError; // Re-throw if we've exhausted retries
      }
      
      // Use currentRoles parameter instead of the roles state to avoid closure issues
      const rolesToUse = currentRoles.length > 0 ? currentRoles : roles;
      
      // Add debug logging for roles
      console.log('Available roles for mapping:', rolesToUse.map(r => ({ 
        _id: r._id, 
        roleName: r.roleName, 
        roleNameCode: r.roleNameCode 
      })));
      
      // Check if roleNameCode is missing from any roles
      const missingRoleNameCodes = rolesToUse.filter(r => !r.roleNameCode);
      if (missingRoleNameCodes.length > 0) {
        console.warn('FOUND ROLES WITHOUT roleNameCode:', missingRoleNameCodes);
      }
      
      // Update pagination total count
      setPagination(prev => ({
        ...prev,
        totalCount: usersData.length
      }));
      
      // Process users data to add display name and computed fields
      const processedUsers = usersData.map(user => {
        // Log roleIds for this user to help with debugging
        console.log(`Processing user ${user._id}, roleIds:`, user.roleIds);
        
        // Debug: Show exact format of roleIds to understand the structure better
        if (Array.isArray(user.roleIds)) {
          console.log('ROLE ID FORMATS:', user.roleIds.map(role => ({
            type: typeof role,
            isObjectId: role instanceof Object && role._id !== undefined,
            stringValue: typeof role === 'string' ? role : typeof role === 'object' ? JSON.stringify(role) : String(role),
            hasRoleNameCode: typeof role === 'object' && role.roleNameCode !== undefined
          })));
        }
        
        // Map role IDs to the actual role objects using the rolesToUse array
        const userRoleCodes = [];
        
        // Handle the case where user.roleIds might be undefined or null
        if (Array.isArray(user.roleIds)) {
          // Process each role ID to get the corresponding roleNameCode
          for (const roleId of user.roleIds) {
            // Case 1: roleId is already an object with roleNameCode property
            if (typeof roleId === 'object' && roleId.roleNameCode) {
              userRoleCodes.push(roleId.roleNameCode);
              continue;
            }
            
            // Case 2: roleId is an object with _id property - convert to string
            // or roleId is already a string - use as is
            const roleIdStr = typeof roleId === 'object' && roleId._id 
              ? String(roleId._id).trim() 
              : String(roleId).trim();
            
            // DEBUG: Log all role IDs before searching to verify what we're working with
            console.log(`AVAILABLE ROLE IDS FOR MATCHING:`, rolesToUse.map(r => ({
              _id: r._id,
              idAsString: String(r._id).trim(),
              roleName: r.roleName,
              roleNameCode: r.roleNameCode
            })));
            
            // Find the matching role in the rolesToUse array
            // Debug log all roles before searching
            console.log(`Searching among ${rolesToUse.length} available roles for ID: ${roleIdStr}`);

            // Try exact match first
            let foundRole = rolesToUse.find(r => {
              const roleDbIdStr = String(r._id).trim();
              const isMatch = roleDbIdStr === roleIdStr;
              console.log(`Comparing ID: '${roleIdStr}' with role ID: '${roleDbIdStr}', exact match: ${isMatch}`);
              return isMatch;
            });

            // If no exact match, try to check if the roleId has MongoDB ObjectID format '507f1f77bcf86cd799439011'
            if (!foundRole && roleIdStr.length === 24 && /^[0-9a-f]{24}$/i.test(roleIdStr)) {
              console.log(`No exact match found, trying MongoDB ObjectID format for ${roleIdStr}`);
            }
            
            // Add the roleNameCode if found, otherwise '?'
            if (foundRole && foundRole.roleNameCode) {
              userRoleCodes.push(foundRole.roleNameCode);
            } else {
              userRoleCodes.push('?');
            }
          }
        }
        
        // Join the role codes with commas - this creates the concatenated roleNameCode display
        const roleNamesStr = userRoleCodes.join(', ');
        
        return {
          ...user,
          id: user._id, // For DataGrid key
          displayName: `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || 'Unnamed User',
          email: user.firebaseUserInfo?.email || 'No email',
          roleNames: roleNamesStr || '',
          // Keep the original fields for potential backward compatibility
          isApproved: user.localUserInfo?.isApproved ? 'Yes' : 'No',
          isEnabled: user.localUserInfo?.isEnabled ? 'Yes' : 'No',
          isOrganizer: user.regionalOrganizerInfo?.organizerId ? 'Yes' : 'No',
          // Add field for Org ID column
          hasOrganizerId: !!user.regionalOrganizerInfo?.organizerId,
          // Ensure the nested objects are preserved for status cards
          localUserInfo: user.localUserInfo || {},
          regionalOrganizerInfo: user.regionalOrganizerInfo || {},
          localAdminInfo: user.localAdminInfo || {},
        };
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
        
        // First fetch all roles to have them available in memory
        try {
          console.log(`Fetching roles for appId: ${appId}`);
          const rolesData = await rolesApi.getRoles(appId);
          
          // Log detailed information about the roles
          console.log('Roles data from API:', rolesData);
          
          // Enhanced debug logging to check each role's structure
          if (Array.isArray(rolesData)) {
            console.log('DETAILED ROLES DATA:', rolesData.map(role => ({
              _id: role._id,
              idType: typeof role._id,
              idString: String(role._id),
              roleName: role.roleName,
              roleNameCode: role.roleNameCode
            })));
          }
          
          // Log if any roles are missing roleNameCode
          if (Array.isArray(rolesData)) {
            const missingCodes = rolesData.filter(r => !r.roleNameCode);
            if (missingCodes.length > 0) {
              console.error('CRITICAL: Roles missing roleNameCode:', missingCodes);
            }
          }
          
          // Ensure roles have roleNameCode - fallback to first two letters of roleName if missing
          const processedRoles = Array.isArray(rolesData) ? rolesData.map(r => {
            if (!r.roleNameCode && r.roleName) {
              // Create a roleNameCode from the first two letters of roleName
              console.warn(`Role ${r.roleName} missing roleNameCode, generating fallback`);
              return { 
                ...r, 
                roleNameCode: r.roleName.substring(0, 2).toUpperCase() 
              };
            }
            return r;
          }) : [];
          
          setRoles(processedRoles);
          
          // Then fetch users with the processed roles
          try {
            // Pass the processed roles directly to refreshUsers to ensure they're used immediately
            await refreshUsers(processedRoles);
            return; // Skip the additional fetch users below since we've already done it
          } catch (userError) {
            console.error('Error fetching users with processed roles:', userError);
            throw userError; // Re-throw to be caught by outer catch
          }
        } catch (roleError) {
          console.error('Error fetching roles:', roleError);
          // Set empty roles array
          setRoles([]);
          alert(`Failed to fetch roles: ${roleError.message}`);
        }
        
        // This is a fallback - only runs if the roles failed to load
        try {
          await refreshUsers([]);
        } catch (userError) {
          console.error('Error fetching users:', userError);
          // Set empty users array
          setUsers([]);
          setFilteredUsers([]);
          alert(`Failed to fetch users: ${userError.message}`);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        
        // Show a helpful error message
        if (error.code === 'ERR_NETWORK') {
          alert(`Backend server appears to be offline. Please ensure the backend is running at ${BE_URL || 'http://localhost:3010'}.`);
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

  // Handle tab change - centralized filtering approach to fix data inconsistency
  const handleTabChange = (event, newValue) => {
    // Set the tab value first
    setTabValue(newValue);
    
    // Use a single filtering approach via the filterUsers function
    // This ensures consistency and centralizes the filtering logic
    filterUsers(searchTerm);
    
    // Consider refreshing data when changing tabs for extra freshness
    // This is optional but can be helpful if data changes frequently
    if (roles.length > 0) {
      // Only refresh if we already have roles data to avoid loading issues
      refreshUsers(roles).catch(error => 
        console.error(`Error refreshing data when changing tabs: ${error.message}`)
      );
    }
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    
    // Small delay for better performance during typing
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }
    
    // Debounce search to prevent excessive filtering during typing
    const debounce = setTimeout(() => {
      filterUsers(term);
    }, 300); // 300ms debounce
    
    setSearchDebounceTimeout(debounce);
  };

  // Filter users based on search term and current tab
  const filterUsers = (term) => {
    let filtered = users;
    
    // Apply tab filtering
    if (tabValue === 1) { // Organizers
      filtered = filtered.filter(user => user.regionalOrganizerInfo?.organizerId);
    } else if (tabValue === 2) { // Admins
      filtered = filtered.filter(user => 
        user.roleIds?.some(role => 
          (typeof role === 'object' && 
           (role.roleName === 'SystemAdmin' || role.roleName === 'RegionalAdmin'))
        )
      );
    }
    
    // Apply search term filtering
    applySearch(filtered, term);
  };

  // Apply search filter to the provided list with improved error handling
  const applySearch = (userList, term) => {
    try {
      // Update pagination information
      setPagination(prev => ({
        ...prev,
        totalCount: userList.length,
        page: 0 // Reset to first page on new search
      }));
      
      if (!term) {
        setFilteredUsers(userList);
        return;
      }
      
      const lowerTerm = term.toLowerCase();
      const filtered = userList.filter(user => {
        try {
          // Add optional chaining for all properties to prevent null/undefined errors
          return (
            (user.displayName?.toLowerCase()?.includes(lowerTerm) || false) ||
            (user.email?.toLowerCase()?.includes(lowerTerm) || false) ||
            (user.roleNames?.toLowerCase()?.includes(lowerTerm) || false) ||
            (user.firebaseUserId?.toLowerCase()?.includes(lowerTerm) || false)
          );
        } catch (error) {
          console.error(`Error filtering user ${user.id || 'unknown'}:`, error);
          return false; // Skip this user on error
        }
      });
      
      setFilteredUsers(filtered);
    } catch (error) {
      console.error('Error in search filtering:', error);
      // Provide fallback behavior
      setFilteredUsers(userList);
    }
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

  // Handle field changes in the user edit form
  const handleUserFieldChange = (fieldPath, value) => {
    if (!editingUser) return;
    
    // Create a deep copy of the editing user
    setEditingUser(prevUser => {
      const newUser = JSON.parse(JSON.stringify(prevUser));
      
      // Handle nested paths like 'localUserInfo.isApproved'
      if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');
        if (!newUser[parent]) {
          newUser[parent] = {};
        }
        newUser[parent][child] = value;
      } else {
        // Handle top-level properties
        newUser[fieldPath] = value;
      }
      
      console.log(`Field ${fieldPath} updated to ${value}`);
      return newUser;
    });
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
      
      // All users now have a valid Firebase ID
      const isFirebaseUser = true;
      
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
      const processedUsers = refreshedUsers.map(user => {
        // Map role IDs to the actual role objects using the roles array
        const userRoleCodes = [];
        
        // Handle the case where user.roleIds might be undefined or null
        if (Array.isArray(user.roleIds)) {
          // Process each role ID to get the corresponding roleNameCode
          for (const roleId of user.roleIds) {
            // Case 1: roleId is already an object with roleNameCode property
            if (typeof roleId === 'object' && roleId.roleNameCode) {
              userRoleCodes.push(roleId.roleNameCode);
              continue;
            }
            
            // Case 2: roleId is an object with _id property - convert to string
            // or roleId is already a string - use as is
            const roleIdStr = typeof roleId === 'object' && roleId._id 
              ? String(roleId._id).trim() 
              : String(roleId).trim();
            
            // Find the matching role in the roles array
            const foundRole = roles.find(r => {
              const roleDbIdStr = String(r._id).trim();
              return roleDbIdStr === roleIdStr;
            });
            
            // Add the roleNameCode if found, otherwise '?'
            if (foundRole && foundRole.roleNameCode) {
              userRoleCodes.push(foundRole.roleNameCode);
            } else {
              userRoleCodes.push('?');
            }
          }
        }
        
        // Join the role codes with commas - this creates the concatenated roleNameCode display
        const roleNamesStr = userRoleCodes.join(', ');
        
        return {
          ...user,
          id: user._id,
          displayName: `${user.localUserInfo?.firstName || ''} ${user.localUserInfo?.lastName || ''}`.trim() || 'Unnamed User',
          email: user.firebaseUserInfo?.email || 'No email',
          roleNames: roleNamesStr || '',
          isApproved: user.localUserInfo?.isApproved ? 'Yes' : 'No',
          isEnabled: user.localUserInfo?.isEnabled ? 'Yes' : 'No',
          isOrganizer: user.regionalOrganizerInfo?.organizerId ? 'Yes' : 'No',
          hasOrganizerId: !!user.regionalOrganizerInfo?.organizerId,
        };
      });
      
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
      
      // Password is required for new users
      if (!newUser.password || newUser.password.length === 0) {
        alert('Password is required to create a new user.');
        setLoading(false);
        return;
      }
      
      // 1. Create user - direct backend call
      try {
        // Create user data
        const userData = {
          email: newUser.email,
          password: newUser.password, // Password is required
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

  // Define columns for DataGrid
  const columns = [
    { field: 'displayName', headerName: 'Name', width: 180 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'roleNames', headerName: 'Roles', width: 120 },
    { 
      field: 'hasOrganizerId', 
      headerName: 'Org ID', 
      width: 80,
      renderCell: (params) => {
        const user = params.row;
        const hasOrganizerId = user.regionalOrganizerInfo?.organizerId;
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            {hasOrganizerId ? (
              <Typography 
                color="success.main" 
                sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}
              >
                ✓
              </Typography>
            ) : (
              <Typography 
                color="text.disabled" 
                sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                -
              </Typography>
            )}
          </Box>
        );
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 200,
      renderCell: (params) => {
        const user = params.row;
        
        // Get status values with safe access
        const userApproved = user.localUserInfo?.isApproved || false;
        const userEnabled = user.localUserInfo?.isEnabled || false;
        const orgApproved = user.regionalOrganizerInfo?.isApproved || false;
        const orgEnabled = user.regionalOrganizerInfo?.isEnabled || false;
        const adminApproved = user.localAdminInfo?.isApproved || false;
        const adminEnabled = user.localAdminInfo?.isEnabled || false;
        
        // Define card style
        const cardStyle = {
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          justifyContent: 'center',
        };
        
        // Define status chip style
        const chipStyle = (isActive) => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          padding: '2px 4px',
          fontSize: '11px',
          fontWeight: 'bold',
          backgroundColor: isActive ? '#e3f2fd' : '#f5f5f5',
          color: isActive ? '#1976d2' : '#757575',
          border: `1px solid ${isActive ? '#bbdefb' : '#e0e0e0'}`,
          width: '28px',
          height: '20px',
        });
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* User Status */}
            <Tooltip title="User Status (Approved/Enabled)">
              <Box sx={{ ...cardStyle, border: '1px solid #e0e0e0', borderRadius: '4px', padding: '2px 4px', backgroundColor: '#f8f9fa' }}>
                <Typography variant="caption" sx={{ fontSize: '10px', width: '16px', color: '#616161' }}>U:</Typography>
                <Box sx={chipStyle(userApproved)}>
                  {userApproved ? 'Y' : 'N'}
                </Box>
                <Box sx={chipStyle(userEnabled)}>
                  {userEnabled ? 'Y' : 'N'}
                </Box>
              </Box>
            </Tooltip>
            
            {/* Organizer Status */}
            <Tooltip title="Organizer Status (Approved/Enabled)">
              <Box sx={{ ...cardStyle, border: '1px solid #e0e0e0', borderRadius: '4px', padding: '2px 4px', backgroundColor: '#f8f9fa' }}>
                <Typography variant="caption" sx={{ fontSize: '10px', width: '16px', color: '#616161' }}>O:</Typography>
                <Box sx={chipStyle(orgApproved)}>
                  {orgApproved ? 'Y' : 'N'}
                </Box>
                <Box sx={chipStyle(orgEnabled)}>
                  {orgEnabled ? 'Y' : 'N'}
                </Box>
              </Box>
            </Tooltip>
            
            {/* Admin Status */}
            <Tooltip title="Admin Status (Approved/Enabled)">
              <Box sx={{ ...cardStyle, border: '1px solid #e0e0e0', borderRadius: '4px', padding: '2px 4px', backgroundColor: '#f8f9fa' }}>
                <Typography variant="caption" sx={{ fontSize: '10px', width: '16px', color: '#616161' }}>A:</Typography>
                <Box sx={chipStyle(adminApproved)}>
                  {adminApproved ? 'Y' : 'N'}
                </Box>
                <Box sx={chipStyle(adminEnabled)}>
                  {adminEnabled ? 'Y' : 'N'}
                </Box>
              </Box>
            </Tooltip>
          </Box>
        );
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
            
            <Tooltip title="Delete user permanently">
              <Button
                variant="text"
                color="error"
                onClick={() => handleDeleteUser(user)}
                startIcon={<DeleteIcon />}
                disabled={isDeleting}
                size="small"
                sx={{ marginLeft: 'auto' }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </Tooltip>
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
      
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ height: 600, width: '100%' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={filteredUsers}
              columns={columns}
              pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              rowCount={pagination.totalCount}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
              onPageSizeChange={(newPageSize) => setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 0 }))}
              disableSelectionOnClick
              density="standard"
              paginationMode="client"
              components={{
                NoRowsOverlay: () => (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    {loading ? 'Loading...' : 'No users found matching the criteria'}
                  </Box>
                )
              }}
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
              columns={columns}
              pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              rowCount={pagination.totalCount}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
              onPageSizeChange={(newPageSize) => setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 0 }))}
              disableSelectionOnClick
              density="standard"
              paginationMode="client"
              components={{
                NoRowsOverlay: () => (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    {loading ? 'Loading...' : 'No users found matching the criteria'}
                  </Box>
                )
              }}
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
              columns={columns}
              pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              rowCount={pagination.totalCount}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
              onPageSizeChange={(newPageSize) => setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 0 }))}
              disableSelectionOnClick
              density="standard"
              paginationMode="client"
              components={{
                NoRowsOverlay: () => (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    {loading ? 'Loading...' : 'No users found matching the criteria'}
                  </Box>
                )
              }}
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
              onChange={handleUserFieldChange}
              loading={loading}
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
                  helperText="Required. Minimum 6 characters."
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