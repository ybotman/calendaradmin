'use client';

import { useCallback } from 'react';
import TabPanel from '@/components/common/TabPanel';
import DataGridWrapper from '@/components/common/DataGridWrapper';
import { useOrganizerContext } from '../../context/OrganizerContext';
import createColumnDefinitions from '../../utils/columnDefinitions';

/**
 * Component for the All Organizers tab
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current tab value
 * @param {number} props.index - This tab's index
 * @param {Function} props.onEditOrganizer - Callback for edit organizer action
 * @param {Function} props.onDeleteOrganizer - Callback for delete organizer action
 * @returns {JSX.Element} AllOrganizersTab component
 */
export default function AllOrganizersTab({ value, index, onEditOrganizer, onDeleteOrganizer }) {
  const { filteredOrganizers, loading } = useOrganizerContext();
  
  // Handle edit
  const handleEditOrganizer = useCallback((organizer) => {
    onEditOrganizer(organizer);
  }, [onEditOrganizer]);
  
  // Handle delete
  const handleDeleteOrganizer = useCallback((organizer) => {
    onDeleteOrganizer(organizer);
  }, [onDeleteOrganizer]);
  
  // Get column definitions
  const columns = createColumnDefinitions({
    onEdit: handleEditOrganizer,
    onDelete: handleDeleteOrganizer
  });
  
  return (
    <TabPanel value={value} index={index}>
      <DataGridWrapper
        loading={loading}
        rows={filteredOrganizers}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        density="standard"
      />
    </TabPanel>
  );
}