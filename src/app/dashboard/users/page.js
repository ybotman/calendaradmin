'use client';

import UserPage from '@/features/users/components/UserPage';
import ErrorBoundary from '@/components/common/ErrorBoundary';

/**
 * User Management page with error boundary
 * 
 * @returns {JSX.Element} Page component
 */
export default function UsersPage() {
  return (
    <ErrorBoundary componentName="User Management">
      <UserPage />
    </ErrorBoundary>
  );
}