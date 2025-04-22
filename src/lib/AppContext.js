'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

// Define available applications with fallback defaults
const defaultApps = [
  { id: '1', name: 'TangoTiempo' },
  { id: '2', name: 'HarmonyJunction' }
];

export function AppProvider({ children }) {
  const [currentApp, setCurrentApp] = useState({ id: '1', name: 'TangoTiempo' });
  const [availableApps, setAvailableApps] = useState(defaultApps);
  const [appError, setAppError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to fetch available applications
  const fetchAvailableApps = async () => {
    setIsLoading(true);
    setAppError(null);
    
    try {
      // Try to fetch apps from the API
      const response = await axios.get('/api/applications');
      
      if (response.data && Array.isArray(response.data)) {
        // Only use response if it contains at least one app
        if (response.data.length > 0) {
          setAvailableApps(response.data);
          console.log('Fetched available applications:', response.data);
          
          // Validate current app against available apps
          if (currentApp && currentApp.id) {
            const appExists = response.data.some(app => app.id === currentApp.id);
            if (!appExists) {
              const error = `Current app ID ${currentApp.id} not found in available apps`;
              console.error(error);
              setAppError(error);
              
              // Don't automatically switch to another app - require explicit selection
              // This prevents silent failures where the wrong application is used
            }
          }
        } else {
          const error = 'No applications found in database';
          console.error(error);
          setAppError(error);
          setAvailableApps(defaultApps);
        }
      } else {
        const error = 'Invalid application data format from server';
        console.error(error);
        setAppError(error);
        setAvailableApps(defaultApps);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setAppError('Failed to fetch available applications');
      setAvailableApps(defaultApps);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to validate an app ID
  const isValidAppId = (appId) => {
    if (!appId) return false;
    return availableApps.some(app => app.id === appId);
  };
  
  // Function to update the current app
  const updateCurrentApp = (app) => {
    // Validate app before updating
    if (!app || !app.id) {
      setAppError('Invalid application selected');
      return false;
    }
    
    // Validate against available apps
    if (!isValidAppId(app.id)) {
      setAppError(`Application ID ${app.id} is not valid`);
      return false;
    }
    
    setCurrentApp(app);
    setAppError(null);
    
    // Store selection in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentApp', JSON.stringify(app));
    }
    
    // Optionally dispatch a custom event to notify components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('appChanged', { detail: app }));
    }
    
    return true;
  };
  
  // Initialize app context
  useEffect(() => {
    // First try to load from localStorage
    if (typeof window !== 'undefined') {
      const storedApp = localStorage.getItem('currentApp');
      if (storedApp) {
        try {
          const parsedApp = JSON.parse(storedApp);
          setCurrentApp(parsedApp); // Set initially, will be validated after fetching apps
        } catch (error) {
          console.error('Error parsing stored app:', error);
        }
      }
    }
    
    // Then fetch available apps
    fetchAvailableApps();
  }, []);
  
  const contextValue = {
    currentApp,
    availableApps,
    updateCurrentApp,
    fetchAvailableApps,
    isValidAppId,
    appError,
    isLoading
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}