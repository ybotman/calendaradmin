'use client';

import { useCallback } from 'react';
import { useUserContext } from '../../context/UserContext';
import DataGridWrapper from '@/components/common/DataGridWrapper';
import TabPanel from '@/components/common/TabPanel';
import createColumnDefinitions from '../../utils/columnDefinitions';

/**
 * Component for the Organizers tab
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current tab value
 * @param {number} props.index - This tab's index
 * @param {Function} props.onEditUser - Callback for edit user action
 * @param {Function} props.onDeleteUser - Callback for delete user action
 * @returns {JSX.Element} OrganizersTab component
 */
export default function OrganizersTab({ value, index, onEditUser, onDeleteUser }) {
  const { filteredUsers, loading } = useUserContext();
  
  // Get column definitions
  const handleEditUser = useCallback((user) => {
    onEditUser(user);
  }, [onEditUser]);
  
  const handleDeleteUser = useCallback((user) => {
    onDeleteUser(user);
  }, [onDeleteUser]);
  
  const { organizerColumns } = createColumnDefinitions({
    onEdit: handleEditUser,
    onDelete: handleDeleteUser
  });
  
  return (
    <TabPanel value={value} index={index}>
      <DataGridWrapper
        loading={loading}
        rows={filteredUsers}
        columns={organizerColumns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        disableSelectionOnClick
        density="standard"
      />
    </TabPanel>
  );
}