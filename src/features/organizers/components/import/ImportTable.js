'use client';

import {
  Box,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Chip,
  Button,
  FormControlLabel,
} from '@mui/material';
import { useOrganizerContext } from '../../context/OrganizerContext';

/**
 * Component to display and select organizers for import
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onSelectAllOrganizers - Callback for selecting all organizers
 * @param {Function} props.onSelectOrganizer - Callback for selecting a single organizer
 * @param {Function} props.onSelectNewOnly - Callback for selecting only new organizers
 * @returns {JSX.Element} ImportTable component
 */
export default function ImportTable({ 
  onSelectAllOrganizers,
  onSelectOrganizer,
  onSelectNewOnly
}) {
  const { importedOrganizers, selectedOrganizers } = useOrganizerContext();
  
  // Check if all are selected
  const areAllSelected = 
    importedOrganizers.length > 0 && 
    Object.values(selectedOrganizers).length > 0 &&
    Object.values(selectedOrganizers).every(value => value === true);
  
  // Check if some are selected
  const areSomeSelected =
    Object.values(selectedOrganizers).some(value => value === true) && 
    Object.values(selectedOrganizers).some(value => value === false);
  
  // Count selected
  const selectedCount = Object.values(selectedOrganizers).filter(v => v).length;
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={areAllSelected}
                indeterminate={areSomeSelected}
                onChange={(e) => onSelectAllOrganizers(e.target.checked)}
              />
            }
            label="Select All"
          />
          <Button
            size="small"
            onClick={onSelectNewOnly}
            sx={{ ml: 1 }}
          >
            Select New Only
          </Button>
        </Box>
        
        <Box>
          {importedOrganizers.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip 
                label={`Total: ${importedOrganizers.length}`} 
                variant="outlined" 
              />
              <Chip 
                label={`Selected: ${selectedCount}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                label={`Duplicates: ${importedOrganizers.filter(o => o.isDuplicate).length}`} 
                color="warning" 
                variant="outlined" 
              />
            </Box>
          )}
        </Box>
      </Box>
      
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  checked={areAllSelected}
                  indeterminate={areSomeSelected}
                  onChange={(e) => onSelectAllOrganizers(e.target.checked)}
                />
              </TableCell>
              <TableCell>Found</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Short Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Website</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {importedOrganizers.map((organizer) => (
              <TableRow key={organizer.id}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={!!selectedOrganizers[organizer.id]}
                    onChange={(e) => onSelectOrganizer(organizer.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  {organizer.isDuplicate ? (
                    <Chip 
                      label="Exists" 
                      size="small" 
                      color="warning"
                      variant="outlined"
                    />
                  ) : (
                    <Chip 
                      label="New" 
                      size="small" 
                      color="success"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell>{organizer.fullName || ''}</TableCell>
                <TableCell>{organizer.shortName || ''}</TableCell>
                <TableCell>{organizer.publicContactInfo?.email || ''}</TableCell>
                <TableCell>{organizer.publicContactInfo?.phone || ''}</TableCell>
                <TableCell>{organizer.publicContactInfo?.url || ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}