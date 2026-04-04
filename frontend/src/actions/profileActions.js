// File: frontend/src/actions/profileActions.js

import {
  CREATE_PROFILEINFO_REQUEST,
  CREATE_PROFILEINFO_SUCCESS,
  CREATE_PROFILEINFO_FAIL,

  CREATE_PROFILEMEDIA_REQUEST,
  CREATE_PROFILEMEDIA_SUCCESS,
  CREATE_PROFILEMEDIA_FAIL,

  FETCH_PROFILEINFO_REQUEST,
  FETCH_PROFILEINFO_SUCCESS,
  FETCH_PROFILEINFO_FAIL,

  UPDATE_PROFILEINFO_REQUEST,
  UPDATE_PROFILEINFO_SUCCESS,
  UPDATE_PROFILEINFO_FAIL,

  UPDATE_PROFILEMEDIA_REQUEST,
  UPDATE_PROFILEMEDIA_SUCCESS,
  UPDATE_PROFILEMEDIA_FAIL,

  FETCH_PROFILEMEDIA_REQUEST,
  FETCH_PROFILEMEDIA_SUCCESS,
  FETCH_PROFILEMEDIA_FAIL

} from './types';

import { resolveApiUrl } from '../utils/apiUrls';
import { getProfileMediaApiBase } from '../utils/profileMediaApi';

const USER_API = resolveApiUrl(process.env.REACT_APP_USER_API, 'http://localhost:7001/api/users', 'USER_API');

/** Chemins par défaut alignés sur user-backend (usersCtrl.register). */
const DEFAULT_PROFILE_SLOT_PATHS = [
  '/mediaprofile/default/slot-0.png',
  '/mediaprofile/default/slot-1.png',
  '/mediaprofile/default/slot-2.png',
  '/mediaprofile/default/slot-3.png',
];

function normalizeProfileMediaList(data) {
  const slots = Array.isArray(data)
    ? data
    : (data?.slots ??
      data?.media ??
      data?.data ??
      data?.items ??
      data?.results ??
      data?.mediaProfiles ??
      data?.list ??
      []);
  return Array.isArray(slots) ? slots : [];
}

/** Indices 0–3 absents de la réponse API (profil sans provisionnement média, ex. ancien script SQL). */
function missingProfileSlotIndices(slots) {
  return [0, 1, 2, 3].filter((i) => !slots.some((s) => Number(s.slot) === i));
}

async function postDefaultProfileSlot(profileId, slot) {
  const base = getProfileMediaApiBase();
  const res = await fetch(`${base}/mediaProfile/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      filename: '',
      path: DEFAULT_PROFILE_SLOT_PATHS[slot],
      type: '',
      slot,
    }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody.error || errBody.details || `Provisionnement slot ${slot} : HTTP ${res.status}`
    );
  }
}

async function ensureProfileMediaSlots(profileId, slots) {
  const missing = missingProfileSlotIndices(slots);
  if (missing.length === 0) return slots;
  console.warn(
    '[fetchProfileMedia] Emplacements manquants, provisionnement:',
    missing,
    '(profileId=',
    profileId,
    ')'
  );
  for (const slot of missing) {
    await postDefaultProfileSlot(profileId, slot);
  }
  const base = getProfileMediaApiBase();
  const url = `${base}/mediaProfile/${profileId}`;
  const token = localStorage.getItem('accessToken');
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur relecture médias après provisionnement');
  return normalizeProfileMediaList(data);
}



export const fetchProfileInfo = (id) => async (dispatch) => {
  dispatch({ type: FETCH_PROFILEINFO_REQUEST });
  const token = localStorage.getItem('accessToken');

  if (!token) {
    dispatch({ type: FETCH_PROFILEINFO_FAIL, payload: 'Token manquant' });
    return;
  }

  try {
    const response = await fetch(`${USER_API}/infoProfile/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur récupération profil');

    dispatch({ type: FETCH_PROFILEINFO_SUCCESS, payload: data });
  } catch (error) {
    dispatch({ type: FETCH_PROFILEINFO_FAIL, payload: error.message });
  }
}

export const createFullProfile = ({ profileInfoCreate = {}, profileMediaCreate = [] }) => async (dispatch) => {
  // 🔹 Création du profil utilisateur
  if (Object.keys(profileInfoCreate).length > 0) {
    dispatch({ type: CREATE_PROFILEINFO_REQUEST });
    try {
      const response = await fetch(`${USER_API}/infoProfile/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileInfoCreate)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur création profil');
      dispatch({ type: CREATE_PROFILEINFO_SUCCESS, payload: data });

      const profileId = data.id;

      // 🔹 Création des médias liés au profil
      if (profileMediaCreate.length > 0) {
        for (const media of profileMediaCreate) {
          dispatch({ type: CREATE_PROFILEMEDIA_REQUEST });
          try {
            const mediaResponse = await fetch(`${getProfileMediaApiBase()}/mediaProfile/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...media, profileId })
            });
            const mediaData = await mediaResponse.json();
            if (!mediaResponse.ok) throw new Error(mediaData.error || 'Erreur création média');
            dispatch({ type: CREATE_PROFILEMEDIA_SUCCESS, payload: mediaData });
          } catch (error) {
            dispatch({ type: CREATE_PROFILEMEDIA_FAIL, payload: error.message });
          }
        }
      }
    } catch (error) {
      dispatch({ type: CREATE_PROFILEINFO_FAIL, payload: error.message });
    }
  }
};


export const updateProfileInfo = (id, formData) => async (dispatch) => {
  dispatch({ type: UPDATE_PROFILEINFO_REQUEST });

  const token = localStorage.getItem('accessToken'); // ✅ dynamique

  if (!token) {
    dispatch({ type: UPDATE_PROFILEINFO_FAIL, payload: 'Token manquant' });
    return;
  }

  try {
    const response = await fetch(`${USER_API}/infoProfile/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur mise à jour profil');

    dispatch({ type: UPDATE_PROFILEINFO_SUCCESS, payload: data });
  } catch (error) {
    dispatch({ type: UPDATE_PROFILEINFO_FAIL, payload: error.message });
  }
};


export const updateProfileMedia = (mediaId, payload) => async (dispatch) => {
  console.log('📤 Début updateProfileMedia pour mediaId :', mediaId);
  console.log('📦 Payload envoyé :', payload);

  dispatch({ type: UPDATE_PROFILEMEDIA_REQUEST });
  const token = localStorage.getItem('accessToken');

  if (!token) {
    console.error('❌ Token manquant');
    dispatch({ type: UPDATE_PROFILEMEDIA_FAIL, payload: 'Token manquant' });
    return;
  }

  const url = `${getProfileMediaApiBase()}/mediaProfile/${mediaId}`;
  console.log('🚀 Requête PUT vers :', url);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('📨 Réponse reçue du backend');
    const data = await response.json();
    console.log('📄 Contenu JSON :', data);

    if (!response.ok) {
      console.error('❌ Réponse non OK :', response.status);
      throw new Error(data.error || 'Erreur mise à jour média');
    }

    console.log('✅ Mise à jour réussie, dispatch UPDATE_PROFILEMEDIA_SUCCESS');
    dispatch({ type: UPDATE_PROFILEMEDIA_SUCCESS, payload: data });
  } catch (error) {
    console.error('❌ Erreur updateProfileMedia :', error.message);
    dispatch({ type: UPDATE_PROFILEMEDIA_FAIL, payload: error.message });
  }
};


export const fetchProfileMedia = (profileId) => async (dispatch) => {
  dispatch({ type: FETCH_PROFILEMEDIA_REQUEST });
  const token = localStorage.getItem('accessToken');

  if (!token) {
    dispatch({ type: FETCH_PROFILEMEDIA_FAIL, payload: 'Token manquant' });
    return;
  }

  const base = getProfileMediaApiBase();
  const url = `${base}/mediaProfile/${profileId}`;
  console.log('[fetchProfileMedia] GET', url, 'profileId=', profileId);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur récupération médias');

    console.log(
      '[fetchProfileMedia] Réponse brute:',
      JSON.stringify(data).slice(0, 500),
      '| type:',
      Array.isArray(data) ? 'array' : typeof data,
      Array.isArray(data) ? `length=${data.length}` : data ? `keys=[${Object.keys(data).join(', ')}]` : ''
    );

    let slots = normalizeProfileMediaList(data);

    slots = await ensureProfileMediaSlots(profileId, slots);

    slots.sort((a, b) => Number(a.slot) - Number(b.slot));
    console.log('[fetchProfileMedia] Slots finaux:', slots.length, slots);

    dispatch({ type: FETCH_PROFILEMEDIA_SUCCESS, payload: slots });
  } catch (error) {
    dispatch({ type: FETCH_PROFILEMEDIA_FAIL, payload: error.message });
  }
};
