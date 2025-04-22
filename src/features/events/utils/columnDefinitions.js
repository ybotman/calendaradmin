import { GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import StarsIcon from '@mui/icons-material/Stars';

/**
 * Function to generate column definitions for events
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onEditEvent - Callback for editing an event
 * @param {Function} options.onDeleteEvent - Callback for deleting an event
 * @param {Function} options.onViewEvent - Callback for viewing an event detail
 * @param {Object} options.imageFlags - Which images to display
 * @returns {Array} Column definitions
 */
export const getEventColumns = ({ 
  onEditEvent, 
  onDeleteEvent, 
  onViewEvent, 
  imageFlags = { eventImage: true } 
}) => {
  return [
    {
      field: 'title',
      headerName: 'Title',
      width: 250,
      renderCell: (params) => (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: 'pointer'
        }} onClick={() => onViewEvent && onViewEvent(params.row)}>
          {imageFlags.eventImage && params.row.eventImage && (
            <img 
              src={params.row.eventImage} 
              alt={params.row.title} 
              style={{ 
                width: '40px', 
                height: '40px', 
                objectFit: 'cover', 
                borderRadius: '4px' 
              }} 
            />
          )}
          <span>{params.value}</span>
        </div>
      )
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 120,
      valueGetter: (params) => new Date(params.row.startDate),
      valueFormatter: (params) => {
        if (!params.value) return '';
        return params.value.toLocaleDateString();
      },
    },
    {
      field: 'endDate',
      headerName: 'End Date',
      width: 120,
      valueGetter: (params) => new Date(params.row.endDate),
      valueFormatter: (params) => {
        if (!params.value) return '';
        return params.value.toLocaleDateString();
      },
    },
    {
      field: 'ownerOrganizerName',
      headerName: 'Organizer',
      width: 150,
    },
    {
      field: 'masteredRegionName',
      headerName: 'Region',
      width: 120,
    },
    {
      field: 'masteredCityName',
      headerName: 'City',
      width: 120,
    },
    {
      field: 'categoryFirst',
      headerName: 'Category',
      width: 120,
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 80,
      renderCell: (params) => (
        params.value ? 
          <CheckIcon color="success" /> : 
          <CloseIcon color="error" />
      ),
    },
    {
      field: 'isFeatured',
      headerName: 'Featured',
      width: 90,
      renderCell: (params) => (
        params.value ? 
          <StarsIcon color="primary" /> : 
          null
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<VisibilityIcon />}
          label="View"
          onClick={() => onViewEvent && onViewEvent(params.row)}
          showInMenu
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => onEditEvent && onEditEvent(params.row)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => onDeleteEvent && onDeleteEvent(params.row)}
          showInMenu
        />,
      ],
    },
  ];
};