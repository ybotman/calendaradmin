'use client';

import { useCallback } from 'react';
import { useEventContext } from '../context/EventContext';
import axios from 'axios';

/**
 * Hook for managing event data operations
 * 
 * @param {string} appId - The current application ID
 * @returns {Object} Event data operations
 */
export default function useEventData(appId) {
  const { dispatch } = useEventContext();

  /**
   * Fetch events based on filters
   */
  const fetchEvents = useCallback(async (filters = {}) => {
    try {
      dispatch({ type: 'FETCH_EVENTS_START' });

      // Default date range is current month to 3 months ahead if not provided
      const defaultStartDate = new Date();
      const defaultEndDate = new Date();
      defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);

      // Build query parameters
      const params = new URLSearchParams({
        appId,
        start: filters.startDate ? filters.startDate.toISOString() : defaultStartDate.toISOString(),
        end: filters.endDate ? filters.endDate.toISOString() : defaultEndDate.toISOString(),
      });

      // Add geo location filters if provided
      if (filters.regionName) params.append('masteredRegionName', filters.regionName);
      if (filters.divisionName) params.append('masteredDivisionName', filters.divisionName);
      if (filters.cityName) params.append('masteredCityName', filters.cityName);

      // Add organizer filter if provided
      if (filters.organizerId) params.append('organizerId', filters.organizerId);

      // Add category filter if provided
      if (filters.category) params.append('category', filters.category);

      console.log('Fetching events with params:', params.toString());

      try {
        // Attempt to fetch events from API
        const response = await axios.get(`/api/events?${params.toString()}`);
        const events = response.data.events || response.data;
  
        console.log(`Successfully fetched ${events.length} events`);
        dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: events });
        return events;
      } catch (apiError) {
        console.error('API error, using mock response for UI testing:', apiError);
        
        // Generate mock events for development/testing
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using mock event data for testing');
          // Build basic mock events for testing the UI
          const mockEvents = generateMockEvents(filters);
          dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: mockEvents });
          return mockEvents;
        } else {
          // In production, report the error normally
          throw apiError;
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      dispatch({ 
        type: 'FETCH_EVENTS_FAILURE', 
        payload: error.response?.data?.message || error.message 
      });
      throw error;
    }
  }, [appId, dispatch]);

  // Helper function to generate mock events for testing
  const generateMockEvents = (filters) => {
    const mockEvents = [];
    const startDate = filters.startDate || new Date();
    const endDate = filters.endDate || new Date(new Date().setMonth(new Date().getMonth() + 3));
    
    // Generate 5 mock events spaced throughout the date range
    const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dayIncrement = Math.max(1, Math.floor(totalDays / 5));
    
    for (let i = 0; i < 5; i++) {
      const eventDate = new Date(startDate);
      eventDate.setDate(eventDate.getDate() + (i * dayIncrement));
      
      mockEvents.push({
        _id: `mock-event-${i}`,
        appId: appId,
        title: `Mock Event ${i + 1} ${filters.regionName || ''}`,
        description: 'This is a mock event for testing when the API is unavailable',
        startDate: eventDate,
        endDate: new Date(new Date(eventDate).setHours(eventDate.getHours() + 3)),
        masteredRegionName: filters.regionName || 'Test Region',
        masteredDivisionName: filters.divisionName || 'Test Division',
        masteredCityName: filters.cityName || 'Test City',
        isActive: true,
        ownerOrganizerName: 'Test Organizer',
        ownerOrganizerID: filters.organizerId || 'mock-organizer-id',
        categoryFirst: filters.category || 'milonga',
        isFeatured: i === 0, // First event is featured
        isDiscovered: false,
        expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      });
    }
    
    return mockEvents;
  };

  /**
   * Get event by ID
   */
  const getEventById = useCallback(async (eventId) => {
    try {
      const response = await axios.get(`/api/events/id/${eventId}?appId=${appId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  }, [appId]);

  /**
   * Create new event
   */
  const createEvent = useCallback(async (eventData) => {
    try {
      const response = await axios.post('/api/events/post', {
        ...eventData,
        appId
      });
      
      // Refresh events list
      fetchEvents();
      
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }, [appId, fetchEvents]);

  /**
   * Update existing event
   */
  const updateEvent = useCallback(async (eventData) => {
    try {
      const response = await axios.put(`/api/events/${eventData._id}?appId=${appId}`, eventData);
      
      // Refresh events list
      fetchEvents();
      
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }, [appId, fetchEvents]);

  /**
   * Delete event
   */
  const deleteEvent = useCallback(async (event) => {
    try {
      await axios.delete(`/api/events/${event._id}?appId=${appId}`);
      
      // Refresh events list
      fetchEvents();
      
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }, [appId, fetchEvents]);

  return {
    fetchEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
  };
}