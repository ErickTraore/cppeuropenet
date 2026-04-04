// File: lespremices/frontend/src/components/profilepage/ProfilePage.jsx

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import {
  fetchProfileInfo,
  updateProfileInfo,
  fetchProfileMedia,
  updateProfileMedia
} from '../../actions/profileActions';
import { getProfileMediaApiBase } from '../../utils/profileMediaApi';
import Spinner from '../common/Spinner';
import "../../styles/pages/ProfilePage.scss";

const ProfilePage = () => {
  const dispatch = useDispatch();

  // ---- Sélecteurs Redux avec shallowEqual pour éviter les re-renders inutiles ----
  const profileInfo = useSelector((state) => state.profileInfo, shallowEqual);
  const { loading, error, data } = profileInfo;

  const profileMedia = useSelector((state) => state.profileMedia, shallowEqual);
  const { slots, loading: mediaLoading, error: mediaError } = profileMedia;

  console.log('[ProfilePage] profileInfo (entier) =', profileInfo);
  console.log('[ProfilePage] profileMedia (entier) =', profileMedia);

  const [activeTab, setActiveTab] = useState('infos');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone1: '',
    phone2: '',
    phone3: '',
    address: '',
  });

  const [uploading, setUploading] = useState({});
  // ---- 1) Chargement initial du profil ----
  useEffect(() => {
    console.log('[ProfilePage] useEffect(mount) → dispatch(fetchProfileInfo())');
    dispatch(fetchProfileInfo());
  }, [dispatch]);

  // ---- 2) Quand le profil est chargé, alimenter le form et charger les médias ----
  useEffect(() => {
    console.log('[ProfilePage] useEffect([data]) → data =', data);

    if (data?.id) {
      console.log('[ProfilePage] Profil détecté, id =', data.id);
      console.log('[ProfilePage] Remplissage du form avec les données du profil');

      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone1: data.phone1 || '',
        phone2: data.phone2 || '',
        phone3: data.phone3 || '',
        address: data.address || '',
      });

      console.log('[ProfilePage] Dispatch fetchProfileMedia avec userId =', data.id);
      dispatch(fetchProfileMedia(data.id));
    } else {
      console.log('[ProfilePage] Aucun data.id pour le moment (profil non chargé ou erreur)');
    }
  }, [data, dispatch]);

  // ---- 3) Écoute d’un éventuel event "tokenUpdated" ----
  useEffect(() => {
    const handleTokenUpdate = () => {
      console.log('[ProfilePage] 🔄 Event tokenUpdated reçu → dispatch(fetchProfileInfo())');
      dispatch(fetchProfileInfo());
    };

    console.log('[ProfilePage] Ajout listener window.tokenUpdated');
    window.addEventListener('tokenUpdated', handleTokenUpdate);
    return () => {
      console.log('[ProfilePage] Retrait listener window.tokenUpdated');
      window.removeEventListener('tokenUpdated', handleTokenUpdate);
    };
  }, [dispatch]);

  // ---- 4) Gestion des changements de champs ----
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`[ProfilePage] handleChange → ${name} =`, value);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ---- 5) Soumission du formulaire d'infos ----
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('[ProfilePage] handleSubmit appelé, form =', form);

    if (data?.id) {
      console.log('[ProfilePage] Dispatch updateProfileInfo avec id =', data.id);
      dispatch(updateProfileInfo(data.id, form));
    } else {
      console.warn('[ProfilePage] Impossible d\'update : data.id manquant');
    }
  };

  // ---- 6) Upload d'image ----
  const handleFileUpload = async (mediaId, file) => {
    console.log('[ProfilePage] 📤 Début upload, mediaId =', mediaId, 'file =', file);

    if (!file) {
      console.warn('[ProfilePage] ❌ Aucun fichier sélectionné');
      return;
    }

    setUploading((prev) => ({ ...prev, [mediaId]: true }));

    const formData = new FormData();
    formData.append('image', file);
    console.log('[ProfilePage] FormData prêt, envoi vers', `${getProfileMediaApiBase()}/uploadImageProfile`);

    try {
      const response = await fetch(`${getProfileMediaApiBase()}/uploadImageProfile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      console.log('[ProfilePage] 📨 Réponse upload brute =', response);

      const result = await response.json().catch((err) => {
        console.error('[ProfilePage] ❌ Erreur parse JSON upload :', err);
        throw err;
      });
      console.log('[ProfilePage] 📄 Contenu JSON upload =', result);

      if (!response.ok || !result.filename) {
        console.error('[ProfilePage] ❌ Upload échoué ou filename manquant, status =', response.status);
        throw new Error('Échec upload image');
      }

      const imageUrl = `/imagesprofile/${result.filename}`;
      console.log('[ProfilePage] ✅ URL image calculée =', imageUrl);

      console.log('[ProfilePage] Dispatch updateProfileMedia avec mediaId =', mediaId);
      await dispatch(updateProfileMedia(mediaId, { url: imageUrl }));

      console.log('[ProfilePage] Rechargement des médias avec userId =', data?.id);
      if (data?.id) {
        await dispatch(fetchProfileMedia(data.id));
      } else {
        console.warn('[ProfilePage] Impossible de recharger les médias : data.id manquant');
      }
    } catch (err) {
      console.error(`[ProfilePage] ❌ Erreur upload image (mediaId=${mediaId}) :`, err);
    } finally {
      console.log('[ProfilePage] 🔚 Fin upload pour mediaId =', mediaId);
      setUploading((prev) => ({ ...prev, [mediaId]: false }));
    }
  };

  // ---- 7) Logs d'état d'affichage ----
  console.log('[ProfilePage] RENDER → loading =', loading, 'error =', error);
  console.log('[ProfilePage] RENDER → mediaLoading =', mediaLoading, 'mediaError =', mediaError);
  console.log('[ProfilePage] RENDER → slots =', slots);

  // ---- 8) Rendus conditionnels ----
  if (loading) {
    console.log('[ProfilePage] Affichage: "Chargement du profil..."');
    return <Spinner size="large" text="Chargement du profil..." />;
  }

  if (error) {
    console.log('[ProfilePage] Affichage erreur profil :', error);
    return <div>Erreur : {error}</div>;
  }

  const safeSlots = Array.isArray(slots) ? slots : [];
  console.log('[ProfilePage] safeSlots (tableau) =', safeSlots);

  // Résolution d'URL : /imagesprofile et /mediaprofile sont servis par nginx en "same-origin"
  // et ne doivent PAS être préfixés par REACT_APP_MEDIA_API (/api/media), sinon 404.
  const resolveProfileMediaSrc = (path, slot) => {
    const slotIndex = slot ?? 0;
    const fallback = `/mediaprofile/default/slot-${slotIndex}.png`;

    if (!path) return fallback;
    if (typeof path !== 'string') return fallback;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    // Ces chemins sont exposés directement par nginx (cf. /imagesprofile/ et /mediaprofile/)
    if (path.startsWith('/imagesprofile/') || path.startsWith('/mediaprofile/')) return path;

    // Autres chemins : tenter via l'API media si configurée
    if (path.startsWith('/')) return `${getProfileMediaApiBase()}${path}`;
    return fallback;
  };

  const handleProfileImageError = (e, slot) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = resolveProfileMediaSrc(null, slot);
  };

  // ---- 9) JSX ----
  return (
    <div className="profile-page">
      <h3>Mon profil</h3>

      <div className="tabs">
        <button onClick={() => { console.log('[ProfilePage] Onglet "infos"'); setActiveTab("infos"); }}>Mes infos</button>
        <button onClick={() => { console.log('[ProfilePage] Onglet "images"'); setActiveTab("images"); }}>Mes images</button>
        <button onClick={() => { console.log('[ProfilePage] Onglet "bio"'); setActiveTab("bio"); }}>Ma biographie</button>
      </div>

      {activeTab === "infos" && (
        <form className="infosform" onSubmit={handleSubmit}>
          <div className="infosform__row">
            <div className="infosform__row__label">Nom</div>
            <input
              className="infosform__row__input"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
            />
          </div>

          <div className="infosform__row">
            <div className="infosform__row__label">Prénom</div>
            <input
              className="infosform__row__input"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
            />
          </div>

          <div className="infosform__row">
            <div className="infosform__row__label">Email</div>
            <input
              className="infosform__row__input"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="infosform__row">
            <div className="infosform__row__label">Phone-1</div>
            <input
              className="infosform__row__input"
              name="phone1"
              value={form.phone1}
              onChange={handleChange}
            />
          </div>

          <div className="infosform__row">
            <div className="infosform__row__label">Phone-2</div>
            <input
              className="infosform__row__input"
              name="phone2"
              value={form.phone2}
              onChange={handleChange}
            />
          </div>

          <div className="infosform__row">
            <div className="infosform__row__label">Phone-3</div>
            <input
              className="infosform__row__input"
              name="phone3"
              value={form.phone3}
              onChange={handleChange}
            />
          </div>

          <div className="infosform__row">
            <div className="infosform__row__label">Adresse :</div>
            <input
              className="infosform__row__input"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="infosform__button">
            Enregistrer
          </button>
        </form>
      )}

      {activeTab === "images" && (
        <div className="images__container">
          {/* Spinner seulement au premier chargement (slots vides) : évite le saut quand PUT met mediaLoading à true */}
          {mediaLoading && safeSlots.length === 0 && (
            <Spinner size="medium" text="Chargement des images..." />
          )}
          {mediaError && <p>Erreur : {mediaError}</p>}
          {!mediaLoading &&
            safeSlots.length === 0 &&
            (Object.values(uploading).some(Boolean) ? (
              <Spinner size="medium" text="Téléversement en cours..." />
            ) : (
              <p>Aucune image disponible.</p>
            ))}

          <div className="images__container__grid">
            {safeSlots.map((media) => (
              <div key={media.id} className="images__container__grid__card">
                <div className="images__container__grid__card__image-wrap">
                  <img
                    src={resolveProfileMediaSrc(media.path, media.slot)}
                    alt="ProfileImage"
                    className="profile-image"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handleProfileImageError(e, media.slot)}
                  />
                </div>

                <div className="images__container__grid__card__upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(media.id, e.target.files[0])
                    }
                    disabled={uploading[media.id]}
                  />
                  {uploading[media.id] && <Spinner size="small" inline={true} text="Téléversement..." />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "bio" && (
        <div className="bio-section">
          <p>📝 Biographie à intégrer ici</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProfilePage);
