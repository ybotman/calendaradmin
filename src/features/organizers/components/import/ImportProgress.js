'use client';

import { 
  Box, 
  Typography, 
  LinearProgress,
  Alert,
} from '@mui/material';
import { useOrganizerContext } from '../../context/OrganizerContext';

/**
 * Component to display import progress
 * 
 * @returns {JSX.Element} ImportProgress component
 */
export default function ImportProgress() {
  const { importProgress, importResults } = useOrganizerContext();
  
  return (
    <Box sx={{ my: 2 }}>
      <Typography variant="body1" gutterBottom>
        Importing organizers...
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress variant="determinate" value={importProgress} />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">{`${importProgress}%`}</Typography>
        </Box>
      </Box>
      
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Box sx={{ bgcolor: 'success.light', px: 2, py: 1, borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">
            Imported: {importResults.success}
          </Typography>
        </Box>
        
        {importResults.skipped > 0 && (
          <Box sx={{ bgcolor: 'warning.light', px: 2, py: 1, borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Skipped: {importResults.skipped}
            </Typography>
          </Box>
        )}
        
        {importResults.error > 0 && (
          <Box sx={{ bgcolor: 'error.light', px: 2, py: 1, borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Failed: {importResults.error}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}