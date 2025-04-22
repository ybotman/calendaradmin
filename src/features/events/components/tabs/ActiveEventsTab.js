'use client';

import { useEventContext } from '../../context/EventContext';
import { getEventColumns } from '../../utils/columnDefinitions';
import TabPanel from '@/components/common/TabPanel';
import DataGridWrapper from '@/components/common/DataGridWrapper';

/**
 * Tab panel for displaying active events
 * 
 * @param {Object} props - Component props
 * @param {number} props.value - Current tab value
 * @param {number} props.index - Tab index
 * @param {Function} props.onEditEvent - Callback for editing an event
 * @param {Function} props.onDeleteEvent - Callback for deleting an event
 * @param {Function} props.onViewEvent - Callback for viewing an event detail
 * @param {Object} props.imageFlags - Which images to display
 * @returns {JSX.Element} ActiveEventsTab component
 */
export default function ActiveEventsTab({ 
  value, 
  index, 
  onEditEvent, 
  onDeleteEvent, 
  onViewEvent,
  imageFlags
}) {
  const { filteredEvents, loading } = useEventContext();
  
  // Filter for active events
  const activeEvents = filteredEvents.filter(event => event.isActive);

  const columns = getEventColumns({ 
    onEditEvent, 
    onDeleteEvent, 
    onViewEvent,
    imageFlags
  });

  return (
    <TabPanel value={value} index={index}>
      <DataGridWrapper
        rows={activeEvents}
        columns={columns}
        loading={loading}
        getRowId={(row) => row._id}
        autoHeight
        disableSelectionOnClick
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
        density="standard"
      />
    </TabPanel>
  );
}