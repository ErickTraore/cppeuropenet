// File: frontend/src/actions/userActions.js
import { resolveApiUrl } from '../utils/apiUrls';

const USER_API = resolveApiUrl(process.env.REACT_APP_USER_API, 'http://localhost:7001/api/users', 'USER_API');

// 🔍 Lire tous les utilisateurs
export const getUsers = () => async (dispatch) => {
  dispatch({ type: 'GET_USERS_REQUEST' });
  try {
    const response = await fetch(`${USER_API}/all/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    const data = await response.json();
    dispatch({ type: 'GET_USERS_SUCCESS', payload: data });
  } catch (error) {
    dispatch({ type: 'GET_USERS_FAIL', payload: error.message });
  }
};

// ➕ Créer un utilisateur
export const createUser = (userData) => async (dispatch) => {
  dispatch({ type: 'CREATE_USER_REQUEST' });
  try {
    const response = await fetch(`${USER_API}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    dispatch({ type: 'CREATE_USER_SUCCESS', payload: data });
  } catch (error) {
    dispatch({ type: 'CREATE_USER_FAIL', payload: error.message });
  }
};

// ✏️ Mettre à jour un utilisateur
export const updateUser = (id, userData) => async (dispatch) => {
  dispatch({ type: 'UPDATE_USER_REQUEST' });
  try {
    const response = await fetch(`${USER_API}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    dispatch({ type: 'UPDATE_USER_SUCCESS', payload: data });
  } catch (error) {
    dispatch({ type: 'UPDATE_USER_FAIL', payload: error.message });
  }
};

// 🗑️ Supprimer un utilisateur
export const deleteUser = (id) => async (dispatch) => {
  dispatch({ type: 'DELETE_USER_REQUEST' });
  try {
    const response = await fetch(`${USER_API}/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    if (response.ok) {
      dispatch({ type: 'DELETE_USER_SUCCESS', payload: id });
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la suppression');
    }
  } catch (error) {
    dispatch({ type: 'DELETE_USER_FAIL', payload: error.message });
  }
};
