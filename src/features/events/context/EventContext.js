'use client';

import { createContext, useContext, useReducer } from 'react';
import eventReducer from './eventReducer';

// Initial state
const initialState = {
  events: [],
  filteredEvents: [],
  loading: false,
  error: null,
  tabValue: 0,
  searchTerm: '',
  searchDescriptionTerm: '',
  editingEvent: null,
  editDialogOpen: false,
  createDialogOpen: false,
  dateRange: {
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 14))
  },
  selectedGeoFilter: {
    regionName: '',
    divisionName: '',
    cityName: ''
  },
  selectedOrganizerShortname: '',
  selectedVenue: '',
  selectedCategory: '',
  showImages: {
    eventImage: true,
    bannerImage: false,
    featuredImage: false,
    seriesImages: false
  }
};

// Create context
const EventContext = createContext();

// Event provider component
export function EventProvider({ children }) {
  const [state, dispatch] = useReducer(eventReducer, initialState);

  return (
    <EventContext.Provider value={{ ...state, dispatch }}>
      {children}
    </EventContext.Provider>
  );
}

// Custom hook to use the event context
export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
}