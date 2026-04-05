import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import './AdminHomeConfig.scss';

const API = '/api/home-config';
/** Aligné sur home-config-backend/middleware/multerHomeImage.js (limits.fileSize). */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const emptyCats = () => [
  { label: '', imageUrl: '' },
  { label: '', imageUrl: '' },
  { label: '', imageUrl: '' },
];

const AdminHomeConfig = () => {
  const [heroText, setHeroText] = useState('');
  const [categories, setCategories] = useState(emptyCats);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      window.location.hash = 'auth';
      return;
    }
    try {
      const d = jwtDecode(token);
      if (d.isAdmin !== true && d.isAdmin !== 1) {
        window.location.hash = 'home';
        return;
      }
    } catch {
      window.location.hash = 'auth';
      return;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(API)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setHeroText(json.heroText || '');
        if (Array.isArray(json.categories) && json.categories.length === 3) {
          setCategories(json.categories.map((c) => ({ label: c.label || '', imageUrl: c.imageUrl || '' })));
        }
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: 'err', text: 'Impossible de charger la configuration.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCat = (index, field, value) => {
    if (field === 'imageUrl') setMessage({ type: '', text: '' });
    setCategories((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleImageFile = async (index, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      const mo = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
      setMessage({ type: 'err', text: `Fichier trop volumineux (max ${mo} Mo). Réduisez l’image ou utilisez une URL.` });
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage({ type: 'err', text: 'Non connecté.' });
      return;
    }
    setUploadingIndex(index);
    setMessage({ type: '', text: '' });
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      if (typeof body.url === 'string' && body.url) {
        setCat(index, 'imageUrl', body.url);
        setMessage({ type: 'ok', text: 'Image enregistrée sur le serveur. N’oubliez pas « Enregistrer » pour valider la page.' });
      }
    } catch (err) {
      setMessage({ type: 'err', text: err.message || 'Échec de l’envoi de l’image.' });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage({ type: 'err', text: 'Non connecté.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    fetch(API, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ heroText, categories }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
        setHeroText(body.heroText || heroText);
        if (Array.isArray(body.categories) && body.categories.length === 3) {
          setCategories(body.categories.map((c) => ({ label: c.label || '', imageUrl: c.imageUrl || '' })));
        }
        setMessage({ type: 'ok', text: 'Enregistré.' });
      })
      .catch((err) => {
        setMessage({ type: 'err', text: err.message || 'Erreur à la sauvegarde.' });
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="admin-home-config">
        <p>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="admin-home-config">
      <h2>Éditer la page d&apos;accueil</h2>
      <p className="admin-home-config__intro">
        Texte du bandeau et trois catégories. Pour chaque catégorie, choisissez une image sur votre ordinateur (max 50 Mo, JPEG/PNG/WebP/GIF) ou indiquez une URL externe.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="admin-home-config__field">
          <label htmlFor="home-hero">Texte du bandeau</label>
          <textarea
            id="home-hero"
            value={heroText}
            onChange={(e) => setHeroText(e.target.value)}
            required
          />
        </div>

        {[0, 1, 2].map((i) => (
          <div key={i} className="admin-home-config__cat">
            <h3>Catégorie {i + 1}</h3>
            <div className="admin-home-config__field">
              <label htmlFor={`home-cat-${i}-label`}>Libellé</label>
              <input
                id={`home-cat-${i}-label`}
                type="text"
                value={categories[i].label}
                onChange={(e) => setCat(i, 'label', e.target.value)}
                required
              />
            </div>
            <div className="admin-home-config__field">
              <span className="admin-home-config__field-label">Image</span>
              <div className="admin-home-config__image-row">
                <label
                  className={`admin-home-config__file-btn${
                    uploadingIndex === i ? ' admin-home-config__file-btn--disabled' : ''
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="admin-home-config__file-input"
                    disabled={uploadingIndex === i}
                    onChange={(e) => {
                      const f = e.target.files && e.target.files[0];
                      e.target.value = '';
                      if (f) handleImageFile(i, f);
                    }}
                  />
                  {uploadingIndex === i ? 'Envoi…' : 'Choisir une image'}
                </label>
                {categories[i].imageUrl ? (
                  <div className="admin-home-config__preview-wrap">
                    <img
                      className="admin-home-config__preview"
                      src={categories[i].imageUrl}
                      alt=""
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="admin-home-config__field">
              <label htmlFor={`home-cat-${i}-url`}>URL de l&apos;image (optionnel, ex. lien externe)</label>
              <input
                id={`home-cat-${i}-url`}
                type="text"
                inputMode="url"
                placeholder="https://… ou laisser l’URL après upload"
                value={categories[i].imageUrl}
                onChange={(e) => setCat(i, 'imageUrl', e.target.value)}
                required
              />
            </div>
          </div>
        ))}

        <div className="admin-home-config__actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {message.text ? (
            <p
              className={`admin-home-config__msg ${
                message.type === 'ok' ? 'admin-home-config__msg--ok' : 'admin-home-config__msg--err'
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
};

export default AdminHomeConfig;
