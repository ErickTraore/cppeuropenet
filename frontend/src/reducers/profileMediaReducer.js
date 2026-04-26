// File: frontend/src/reducers/profileMediaReducer.js

const initialState = {
  slots: [],
  loading: false,
  error: null
};

export const profileMediaReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_PROFILEMEDIA_REQUEST':
      return { ...state, loading: true, error: null };

    case 'FETCH_PROFILEMEDIA_SUCCESS':
      return { ...state, loading: false, slots: Array.isArray(action.payload) ? action.payload : [] };

    case 'FETCH_PROFILEMEDIA_FAIL':
      return { ...state, loading: false, error: action.payload };

    case 'UPDATE_PROFILEMEDIA_REQUEST':
      return { ...state, loading: true };

    case 'UPDATE_PROFILEMEDIA_SUCCESS':
      return {
        ...state,
        loading: false,
        slots: Array.isArray(state.slots)
          ? state.slots.map(slot =>
            Number(slot.id) === Number(action.payload.id) ? action.payload : slot
          )
          : [action.payload] // fallback minimal
      };


    case 'UPDATE_PROFILEMEDIA_FAIL':
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

export default profileMediaReducer;
