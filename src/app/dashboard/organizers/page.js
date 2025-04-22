'use client';

import OrganizerPage from '@/features/organizers/components/OrganizerPage';
import ErrorBoundary from '@/components/common/ErrorBoundary';

/**
 * Organizer Management page with error boundary
 * 
 * @returns {JSX.Element} Page component
 */
export default function OrganizersPage() {
  return (
    <ErrorBoundary componentName="Organizer Management">
      <OrganizerPage />
    </ErrorBoundary>
  );
}