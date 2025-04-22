/**
 * Reducer for event state management
 */
export default function eventReducer(state, action) {
  switch (action.type) {
    case 'FETCH_EVENTS_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case 'FETCH_EVENTS_SUCCESS':
      return {
        ...state,
        events: action.payload,
        filteredEvents: action.payload,
        loading: false,
        error: null
      };
    
    case 'FETCH_EVENTS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    case 'SET_FILTERED_EVENTS':
      return {
        ...state,
        filteredEvents: action.payload
      };
    
    case 'SET_TAB_VALUE':
      return {
        ...state,
        tabValue: action.payload
      };
    
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.payload
      };
    
    case 'SET_SEARCH_DESCRIPTION_TERM':
      return {
        ...state,
        searchDescriptionTerm: action.payload
      };
    
    case 'SET_EDITING_EVENT':
      return {
        ...state,
        editingEvent: action.payload,
        editDialogOpen: true
      };
    
    case 'SET_EDIT_DIALOG_OPEN':
      return {
        ...state,
        editDialogOpen: action.payload,
        editingEvent: action.payload ? state.editingEvent : null
      };
    
    case 'SET_CREATE_DIALOG_OPEN':
      return {
        ...state,
        createDialogOpen: action.payload
      };
    
    case 'SET_DATE_RANGE':
      return {
        ...state,
        dateRange: action.payload
      };
    
    case 'SET_GEO_FILTER':
      return {
        ...state,
        selectedGeoFilter: action.payload
      };
    
    case 'SET_ORGANIZER_FILTER':
      return {
        ...state,
        selectedOrganizerShortname: action.payload
      };
    
    case 'SET_VENUE_FILTER':
      return {
        ...state,
        selectedVenue: action.payload
      };
    
    case 'SET_CATEGORY_FILTER':
      return {
        ...state,
        selectedCategory: action.payload
      };
    
    case 'TOGGLE_IMAGE_DISPLAY':
      return {
        ...state,
        showImages: {
          ...state.showImages,
          [action.payload]: !state.showImages[action.payload]
        }
      };
    
    default:
      return state;
  }
}