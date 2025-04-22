'use client';

import { Box, CircularProgress, Paper } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

/**
 * A wrapper for the MUI DataGrid that handles loading states and provides consistent styling.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Whether data is currently loading
 * @param {Array} props.rows - Row data for the grid
 * @param {Array} props.columns - Column definitions for the grid
 * @param {number} [props.pageSize=10] - Number of rows per page
 * @param {Array} [props.rowsPerPageOptions=[10, 25, 50]] - Available page size options
 * @param {Object} [props.sx] - Additional MUI sx styling
 * @param {number} [props.height=600] - Height of the grid in pixels
 * @returns {JSX.Element} DataGridWrapper component
 */
export default function DataGridWrapper({
  loading,
  rows,
  columns,
  pageSize = 10,
  rowsPerPageOptions = [10, 25, 50],
  sx = {},
  height = 600,
  ...rest
}) {
  return (
    <Paper sx={{ height: height, width: '100%', ...sx }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={pageSize}
          rowsPerPageOptions={rowsPerPageOptions}
          disableSelectionOnClick
          density="standard"
          {...rest}
        />
      )}
    </Paper>
  );
}