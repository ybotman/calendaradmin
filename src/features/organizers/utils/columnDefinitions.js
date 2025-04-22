import { Box, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Creates column definitions for organizers DataGrid
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onEdit - Callback for edit button
 * @param {Function} options.onDelete - Callback for delete button
 * @returns {Array} Column definitions
 */
export default function createColumnDefinitions({ onEdit, onDelete }) {
  return [
    { field: 'displayName', headerName: 'Name', flex: 1 },
    { field: 'shortDisplayName', headerName: 'Short Name', flex: 1 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'enabled', headerName: 'Enabled', width: 120 },
    { field: 'wantRender', headerName: 'Want Render', width: 120 },
    { field: 'userConnected', headerName: 'User Connected', width: 150 },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <Button
            variant="text"
            color="primary"
            onClick={() => onEdit(params.row)}
            startIcon={<EditIcon />}
            sx={{ mr: 1 }}
            size="small"
          >
            Edit
          </Button>
          <Button
            variant="text"
            color="error"
            onClick={() => onDelete(params.row)}
            startIcon={<DeleteIcon />}
            size="small"
          >
            Delete
          </Button>
        </Box>
      ) 
    },
  ];
}