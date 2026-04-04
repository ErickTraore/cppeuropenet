// File: frontend/src/actions/messageActions.js

import { FETCH_MESSAGES } from './types';
import { resolveApiUrl } from '../utils/apiUrls';

const USER_API = resolveApiUrl(process.env.REACT_APP_USER_API, 'http://localhost:7001/api/users', 'USER_API');
const PRESSE_GENERALE_API = resolveApiUrl(process.env.REACT_APP_PRESSE_GENERALE_API, USER_API, 'PRESSE_GENERALE_API');

export const fetchMessages = (categ = null) => {
  return async dispatch => {
    try {
      const url = categ 
        ? `${PRESSE_GENERALE_API}/messages/?categ=${categ}`
        : `${PRESSE_GENERALE_API}/messages/`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Erreur API messages:', data);
        dispatch({ type: FETCH_MESSAGES, payload: [] });
        return;
      }
      dispatch({ type: FETCH_MESSAGES, payload: Array.isArray(data) ? data : [] });
    } catch (error) {
      console.error('Erreur lors de la récupération des messages', error);
    }
  };
};
export const fetchMediaForMessages = (messageIds) => async (dispatch) => {
  try {
    const mediaData = {};
    for (const messageId of messageIds) {
      const response = await fetch(`${PRESSE_GENERALE_API}/message/${messageId}`);
      const data = await response.json();
      mediaData[messageId] = data;
    }
    dispatch({ type: 'FETCH_MEDIA_SUCCESS', payload: mediaData });
  } catch (error) {
    console.error("❌ Erreur lors du chargement des médias:", error);
    dispatch({ type: 'FETCH_MEDIA_ERROR', error });
  }
};


export const addMessage = (formData) => {
  return async dispatch => {
    try {
      // Envoyer le titre et le contenu au backend "user--backend"
      const messageData = {
        title: formData.get('title') || formData.get('tittle'),
        content: formData.get('content'),
      };

      await fetch(`${PRESSE_GENERALE_API}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      // Uploader les fichiers image et vidéo au backend "MEDIA-BACKEND"
      const mediaFormData = new FormData();
      if (formData.get('image')) {
        mediaFormData.append('image', formData.get('image'));
      }
      if (formData.get('video')) {
        mediaFormData.append('video', formData.get('video'));
      }

      if (formData.get('image') && formData.get('video')) {
        await fetch(`${USER_API}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: mediaFormData,
        });
      }

      // Après l'ajout d'un nouveau message, mettre à jour la liste des messages
      dispatch(fetchMessages());
    } catch (error) {
      console.error('Erreur lors de l\'ajout du message', error);
    }
  };
  
};