'use client';

import { useCallback } from 'react';
import { useEventContext } from '../context/EventContext';
import apiClient from '@/lib/api-client';

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

      // Fetch events
      const response = await apiClient.get(`/api/events?${params.toString()}`);
      const events = response.data.events || response.data;

      dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: events });
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      dispatch({ 
        type: 'FETCH_EVENTS_FAILURE', 
        payload: error.response?.data?.message || error.message 
      });
      throw error;
    }
  }, [appId, dispatch]);

  /**
   * Get event by ID
   */
  const getEventById = useCallback(async (eventId) => {
    try {
      const response = await apiClient.get(`/api/events/id/${eventId}?appId=${appId}`);
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
      const response = await apiClient.post('/api/events/post', {
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
      const response = await apiClient.put(`/api/events/${eventData._id}?appId=${appId}`, eventData);
      
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
      await apiClient.delete(`/api/events/${event._id}?appId=${appId}`);
      
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