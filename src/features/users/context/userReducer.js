/**
 * Reducer for managing user state.
 * 
 * @param {Object} state - Current state
 * @param {Object} action - Action to perform
 * @returns {Object} New state
 */
export default function userReducer(state, action) {
  switch (action.type) {
    case 'FETCH_USERS_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
      
    case 'FETCH_USERS_SUCCESS':
      return {
        ...state,
        users: action.payload.users,
        filteredUsers: action.payload.users,
        roles: action.payload.roles,
        loading: false,
        error: null,
      };
      
    case 'FETCH_USERS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
      
    case 'SET_FILTERED_USERS':
      return {
        ...state,
        filteredUsers: action.payload,
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
      
    case 'SET_EDITING_USER':
      return {
        ...state,
        editingUser: action.payload,
        dialogOpen: true,
      };
      
    case 'CLOSE_DIALOG':
      return {
        ...state,
        editingUser: null,
        dialogOpen: false,
      };
      
    case 'SET_ADD_USER_DIALOG_OPEN':
      return {
        ...state,
        addUserDialogOpen: action.payload,
      };
      
    case 'SET_SELECTED_USER':
      return {
        ...state,
        selectedUser: action.payload,
      };
      
    case 'UPDATE_NEW_USER_FIELD':
      return {
        ...state,
        newUser: {
          ...state.newUser,
          [action.payload.field]: action.payload.value,
        },
      };
      
    case 'RESET_NEW_USER':
      return {
        ...state,
        newUser: {
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          active: true,
          isOrganizer: false,
        },
      };
      
    default:
      return state;
  }
}