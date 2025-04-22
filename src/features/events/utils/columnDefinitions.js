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
      valueGetter: (params) => {
        // For the first row, debug the structure
        if (params.id === 0 || params.id === '0') {
          console.log('First row data in grid:', params.row);
        }
        
        // Get the value through multiple paths to handle all possible structures
        if (params.row) {
          // Return the first non-empty value found
          return params.row.title || 
                params.value || 
                '(Untitled Event)';
        }
        
        return '(Untitled Event)';
      },
      renderCell: (params) => {
        // Check if params.row exists before accessing properties
        if (!params.row) {
          return <span>(Invalid Event)</span>;
        }
        
        // Get title value with fallback
        const title = params.row.title || params.value || '(Untitled Event)';
        
        return (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }} onClick={() => onViewEvent && onViewEvent(params.row)}>
            {imageFlags.eventImage && params.row.eventImage && (
              <img 
                src={params.row.eventImage} 
                alt={title} 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  objectFit: 'cover', 
                  borderRadius: '4px' 
                }} 
              />
            )}
            <span>{title}</span>
          </div>
        );
      }
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 120,
      valueFormatter: (params) => {
        // Safety check for params
        if (!params || !params.row) return '';
        
        // Handle date string directly
        if (params.row.startDate) {
          try {
            const date = new Date(params.row.startDate);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString();
            }
          } catch (err) {
            console.warn('Error formatting startDate:', err);
          }
        }
        
        return '';
      },
    },
    {
      field: 'endDate',
      headerName: 'End Date',
      width: 120,
      valueFormatter: (params) => {
        // Handle date string directly
        if (params.row && params.row.endDate) {
          try {
            const date = new Date(params.row.endDate);
            if (!isNaN(date.getTime())) {
              return date.toLocaleDateString();
            }
          } catch (err) {
            console.warn('Error formatting endDate:', err);
          }
        }
        
        return '';
      },
    },
    {
      field: 'ownerOrganizerName',
      headerName: 'Organizer',
      width: 150,
      valueFormatter: (params) => {
        // For debugging the first row
        if (params.id === 0 || params.id === '0') {
          console.log('Organizer data:', {
            shortName: params.row?.shortName,
            ownerOrganizerName: params.row?.ownerOrganizerName,
            ownerName: params.row?.ownerName,
            organizer: params.row?.organizer
          });
        }
        
        // Try to get the short name first, fallback to full name
        return params.row?.shortName || 
               params.row?.ownerOrganizerName || 
               params.row?.ownerName || 
               '';
      },
    },
    {
      field: 'masteredRegionName',
      headerName: 'Region',
      width: 120,
      valueFormatter: (params) => {
        // For debugging the first row
        if (params.id === 0 || params.id === '0') {
          console.log('Region data:', {
            masteredRegionName: params.row?.masteredRegionName,
            regionName: params.row?.regionName
          });
        }
        
        return params.row?.masteredRegionName || 
               params.row?.regionName || 
               '';
      },
    },
    {
      field: 'masteredCityName',
      headerName: 'City',
      width: 120,
      valueFormatter: (params) => {
        // For debugging the first row
        if (params.id === 0 || params.id === '0') {
          console.log('City data:', {
            masteredCityName: params.row?.masteredCityName,
            cityName: params.row?.cityName,
            city: params.row?.city
          });
        }
        
        return params.row?.masteredCityName || 
               params.row?.cityName || 
               params.row?.city || 
               '';
      },
    },
    {
      field: 'categoryCode',
      headerName: 'Category',
      width: 120,
      valueFormatter: (params) => {
        // Check if params exists to avoid errors
        if (!params || !params.row) return '';
        
        // Log category data for debugging on first few rows
        if (params.api && params.api.getRowIndexRelativeToVisibleTop(params.id) < 2) {
          console.log('Category data for row:', {
            categoryFirst: params.row.categoryFirst,
            categorySecond: params.row.categorySecond,
            categoryThird: params.row.categoryThird,
          });
        }
        
        // Concatenate all non-empty category values
        const categories = [
          params.row.categoryFirst,
          params.row.categorySecond,
          params.row.categoryThird
        ].filter(Boolean); // Filter out undefined, null, empty string values
        
        // Join with commas or return a default value
        return categories.length > 0 ? categories.join(', ') : '';
      },
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 80,
      // Set default value for row.isActive
      valueGetter: (params) => {
        // Default to true if undefined or params.row is null
        if (!params.row) return true;
        return params.row.isActive === undefined ? true : params.row.isActive;
      },
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
      // Set default value for row.isFeatured
      valueGetter: (params) => {
        // Default to false if undefined or params.row is null
        if (!params.row) return false;
        return params.row.isFeatured === undefined ? false : params.row.isFeatured;
      },
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
      getActions: (params) => {
        // Check if params.row exists to prevent errors
        if (!params.row) {
          return [];
        }
        
        return [
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
        ];
      },
    },
  ];
};