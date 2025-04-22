import { Box, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Creates column definitions for the users DataGrid
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onEdit - Callback for edit button
 * @param {Function} options.onDelete - Callback for delete button
 * @returns {Object} Column definitions for different tabs
 */
export default function createColumnDefinitions({ onEdit, onDelete }) {
  
  /**
   * Action column shared between all tabs
   */
  const actionsColumn = { 
    field: 'actions', 
    headerName: 'Actions', 
    width: 150,
    renderCell: (params) => {
      const user = params.row;
      
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="text"
            color="primary"
            onClick={() => onEdit(user)}
            startIcon={<EditIcon />}
            size="small"
          >
            Edit
          </Button>
          
          <Button
            variant="text"
            color="error"
            onClick={() => onDelete(user)}
            startIcon={<DeleteIcon />}
            size="small"
          >
            Delete
          </Button>
        </Box>
      );
    }
  };

  /**
   * Columns for the All Users tab
   */
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
    actionsColumn,
  ];
  
  /**
   * Columns for the Organizers tab
   */
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
    actionsColumn,
  ];
  
  /**
   * Columns for the Admins tab
   */
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
    actionsColumn,
  ];
  
  return {
    allUsersColumns,
    organizerColumns,
    adminColumns
  };
}