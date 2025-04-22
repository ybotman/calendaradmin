/**
 * Reducer for managing organizer state.
 * 
 * @param {Object} state - Current state
 * @param {Object} action - Action to perform
 * @returns {Object} New state
 */
export default function organizerReducer(state, action) {
  switch (action.type) {
    case 'FETCH_ORGANIZERS_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
      
    case 'FETCH_ORGANIZERS_SUCCESS':
      return {
        ...state,
        organizers: action.payload,
        filteredOrganizers: action.payload,
        loading: false,
        error: null,
      };
      
    case 'FETCH_ORGANIZERS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
      
    case 'SET_FILTERED_ORGANIZERS':
      return {
        ...state,
        filteredOrganizers: action.payload,
      };
      
    case 'SET_SEARCH_TERM':
      return {
        ...state,
        searchTerm: action.payload,
      };
      
    case 'SET_TAB_VALUE':
      return {
        ...state,
        tabValue: action.payload,
      };
      
    case 'SET_EDITING_ORGANIZER':
      return {
        ...state,
        editingOrganizer: action.payload,
        dialogOpen: true,
      };
      
    case 'CLOSE_DIALOG':
      return {
        ...state,
        editingOrganizer: null,
        dialogOpen: false,
      };
      
    case 'SET_CREATE_DIALOG_OPEN':
      return {
        ...state,
        createDialogOpen: action.payload,
      };
      
    // Import dialog actions
    case 'SET_IMPORT_DIALOG_OPEN':
      return {
        ...state,
        importDialogOpen: action.payload,
      };
      
    case 'SET_IMPORT_STATUS':
      return {
        ...state,
        importStatus: action.payload,
      };
      
    case 'SET_FETCHING_BTC_ORGANIZERS':
      return {
        ...state,
        fetchingBTCOrganizers: action.payload,
      };
      
    case 'SET_IMPORTED_ORGANIZERS':
      return {
        ...state,
        importedOrganizers: action.payload,
      };
      
    case 'SET_SELECTED_ORGANIZERS':
      return {
        ...state,
        selectedOrganizers: action.payload,
      };
      
    case 'SET_IMPORT_PROGRESS':
      return {
        ...state,
        importProgress: action.payload,
      };
      
    case 'SET_IMPORT_RESULTS':
      return {
        ...state,
        importResults: action.payload,
      };
      
    case 'UPDATE_IMPORT_RESULTS':
      return {
        ...state,
        importResults: {
          ...state.importResults,
          [action.payload.key]: state.importResults[action.payload.key] + 1
        },
      };
      
    default:
      return state;
  }
}