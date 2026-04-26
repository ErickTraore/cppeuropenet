// PresseGeneraleManager.jsx - Interface CRUD Gérer la presse générale

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMessages } from '../../actions/messageActions';
import { resolveApiUrl } from '../../utils/apiUrls';
import { getPresseGeneraleMediaApiBase, absolutizePresseGeneraleMediaUrl } from '../../utils/presseGeneraleMedia';
import { getAllowedTypesFromTitle, getManagerMediaNoteKind, getAllowedTypesFromFormat } from '../../utils/managerMediaNote';
import './PresseGeneraleManager.css';

const USER_API = resolveApiUrl(process.env.REACT_APP_USER_API, 'http://localhost:7001/api/users', 'USER_API');
const PRESSE_GENERALE_API = resolveApiUrl(process.env.REACT_APP_PRESSE_GENERALE_API, USER_API, 'PRESSE_GENERALE_API');
const MEDIA_API = `${getPresseGeneraleMediaApiBase().replace(/\/$/, '')}`;

const PresseGeneraleManager = () => {
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.messages.messages);
  const messagesList = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', link: '', attachment: '' });
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [messageMedia, setMessageMedia] = useState({});

  useEffect(() => { dispatch(fetchMessages('presse')); }, [dispatch]);

  useEffect(() => {
    if (messagesList.length === 0) return;

    const loadMedia = async () => {
      const media = {};
      for (const msg of messagesList) {
        try {
          const res = await fetch(`${MEDIA_API}/getMedia/${msg.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
          });
          if (res.ok) {
            const data = await res.json();
            const normalized = (Array.isArray(data) ? data : []).map((f) => ({
              ...f,
              path: absolutizePresseGeneraleMediaUrl(
                f.url || (f.path ? f.path.replace("/usr/src/app/uploads", "/api/uploads") : "")
              ),
            }));
            media[msg.id] = normalized;
          }
        } catch (err) {
          console.error(`Erreur média ${msg.id}:`, err);
        }
      }
      setMessageMedia(media);
    };
    loadMedia();
  }, [messagesList]);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const resetForm = () => {
    setFormData({ title: '', content: '', link: '', attachment: '' });
    setImageFile(null);
    setVideoFile(null);
    setEditingId(null);
  };

  const handleEdit = (msg) => {
    setEditingId(msg.id);
    setFormData({ title: msg.title || '', content: msg.content || '', link: msg.link || '', attachment: msg.attachment || '' });
    setImageFile(null);
    setVideoFile(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("accessToken");
      const mediaForMessage = Array.isArray(messageMedia[editingId]) ? messageMedia[editingId] : [];
      const currentMessage = messagesList.find((m) => m.id === editingId);
      const allowedByTitle = getAllowedTypesFromTitle(currentMessage?.title || formData.title || '');

      if (allowedByTitle) {
        if (imageFile && !allowedByTitle.image) {
          alert('❌ Format non autorisé: cet article ne peut pas recevoir d\'image.');
          return;
        }
        if (videoFile && !allowedByTitle.video) {
          alert('❌ Format non autorisé: cet article ne peut pas recevoir de vidéo.');
          return;
        }
      }

      const res = await fetch(`${PRESSE_GENERALE_API}/messages/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Erreur');

      if (imageFile) {
        const existingImages = mediaForMessage.filter((m) => (m.type || '').toLowerCase() === 'image');
        for (const media of existingImages) {
          await fetch(`${MEDIA_API}/media/${media.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
        const fd = new FormData();
        fd.append('image', imageFile);
        fd.append('messageId', editingId);
        fd.append('format', currentMessage?.format || '');
        await fetch(`${MEDIA_API}/uploadImage`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
      }

      if (videoFile) {
        const existingVideos = mediaForMessage.filter((m) => (m.type || '').toLowerCase() === 'video');
        for (const media of existingVideos) {
          await fetch(`${MEDIA_API}/media/${media.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
        const fd = new FormData();
        fd.append('video', videoFile);
        fd.append('messageId', editingId);
        fd.append('format', currentMessage?.format || '');
        await fetch(`${MEDIA_API}/uploadVideo`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
      }

      alert('✅ Modifié !');
      resetForm();
      dispatch(fetchMessages('presse'));
    } catch (error) {
      alert('❌ Erreur modification');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Supprimer ?')) return;
    try {
      const res = await fetch(`${PRESSE_GENERALE_API}/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem("accessToken")}` }
      });
      if (!res.ok) throw new Error('Erreur');
      alert('✅ Supprimé !');
      dispatch(fetchMessages('presse'));
    } catch (error) {
      alert('❌ Erreur suppression');
    }
  };

  return (
    <div className="admin-presse-manager">
      <h1 className="admin-title">🔧 GESTION PRESSE (ADMIN)</h1>

      <div className="messages-list">
        <h2>📋 Messages existants ({messagesList.length})</h2>
        {messagesList.length === 0 ? (
          <p className="no-messages">Aucun message</p>
        ) : (
          messagesList.map((msg) => (
            <div key={msg.id} className="message-card">
              {editingId === msg.id ? (
                <form onSubmit={handleUpdate} className="crud-form">
                  <h3>✏️ Modifier #{msg.id}</h3>
                  <input type="text" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} required />
                  <textarea value={formData.content} onChange={(e) => handleChange('content', e.target.value)} required rows="5" />
                  <input type="text" value={formData.link} onChange={(e) => handleChange('link', e.target.value)} />
                  <input type="text" value={formData.attachment} onChange={(e) => handleChange('attachment', e.target.value)} />

                  {messageMedia[msg.id] && messageMedia[msg.id].length > 0 && (
                    <div className="message-media">
                      <h4>📁 Médias actuels :</h4>
                      {messageMedia[msg.id].map((m) => (
                        <div key={m.id} className="media-item-display">
                          {m.type === 'image' ? (
                            <div className="media-preview">
                              <img src={m.path} alt={m.filename} className="media-thumbnail" />
                              <span className="media-filename">🖼️ {m.filename}</span>
                            </div>
                          ) : (
                            <div className="media-preview">
                              <video controls className="media-thumbnail">
                                <source src={m.path} type="video/mp4" />
                              </video>
                              <span className="media-filename">🎥 {m.filename}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="media-upload-section">
                    <h4>🔄 Remplacer les médias :</h4>
                    {(() => {
                      const mediaList = Array.isArray(messageMedia[msg.id]) ? messageMedia[msg.id] : [];
                      const noteKind = getManagerMediaNoteKind(msg.title || '', mediaList, msg.format || '');
                      const allowedByFormat = getAllowedTypesFromFormat(msg.format || '');
                      const hasImage = mediaList.some((m) => (m.type || '').toLowerCase() === 'image');
                      const hasVideo = mediaList.some((m) => (m.type || '').toLowerCase() === 'video');
                      const showImage = hasImage || !!(allowedByFormat && allowedByFormat.image);
                      const showVideo = hasVideo || !!(allowedByFormat && allowedByFormat.video);

                      return (
                        <>
                          {showImage && (
                            <div className="media-upload">
                              <label>📷 {hasImage ? 'Remplacer l\'image' : 'Ajouter une image'} :</label>
                              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                              {imageFile && <p className="file-count">✅ {imageFile.name} sélectionnée</p>}
                            </div>
                          )}

                          {showVideo && (
                            <div className="media-upload">
                              <label>🎥 {hasVideo ? 'Remplacer la vidéo' : 'Ajouter une vidéo'} :</label>
                              <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} />
                              {videoFile && <p className="file-count">✅ {videoFile.name} sélectionnée</p>}
                            </div>
                          )}

                          {/* Correction : la note "texte seul" ne doit JAMAIS s'afficher si un média est présent ou attaché */}
                          {(Array.isArray(mediaList) && mediaList.length > 0) || msg.attachment ? null : (
                            noteKind === 'text-only' && (
                              <p className="media-note">📝 Cet article est de type "Texte seul" - aucun média ne peut être ajouté.</p>
                            )
                          )}

                          {noteKind === 'mismatch' && (
                            <p className="media-note">⚠️ Incohérence: ce format attend un média, mais aucun média n'a été chargé pour cet article.</p>
                          )}

                          {noteKind === 'replace' && (
                            <p className="media-note">💡 Vous pouvez uniquement remplacer les médias existants. Le type d'article ne peut pas être modifié.</p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">💾 Sauvegarder</button>
                    <button type="button" onClick={resetForm} className="btn-cancel">❌ Annuler</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="message-header">
                    <h3>{msg.title}</h3>
                    <span className="message-id">ID: {msg.id}</span>
                  </div>
                  <p className="message-content">{msg.content}</p>
                  {msg.link && <p className="message-link">🔗 <a href={msg.link} target="_blank" rel="noopener noreferrer">{msg.link}</a></p>}
                  {msg.attachment && <p className="message-attachment">📎 {msg.attachment}</p>}
                  {/* DEBUG: Affiche le contenu brut de messageMedia[msg.id] */}
                  <pre style={{background:'#ffe',color:'#a00',fontSize:'0.8em',padding:'4px',margin:'4px 0'}}>
                    {JSON.stringify(messageMedia[msg.id], null, 2)}
                  </pre>
                  {messageMedia[msg.id] && messageMedia[msg.id].length > 0 && (
                    <div className="message-media">
                      <h4>📁 Médias :</h4>
                      <div className="media-gallery">
                        {messageMedia[msg.id].map((m) => (
                          <div key={m.id} className="media-item-card">
                            {m.type === 'image' ? (
                              <img src={m.path} alt={m.filename} className="media-display" />
                            ) : (
                              <video controls className="media-display">
                                <source src={m.path} type="video/mp4" />
                              </video>
                            )}
                            <div className="media-card-footer">
                              <span className="media-label">{m.type === 'image' ? '🖼️' : '🎥'} {m.filename}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="message-actions">
                    <button onClick={() => handleEdit(msg)} className="btn-edit">✏️ Modifier</button>
                    <button onClick={() => handleDelete(msg.id)} className="btn-delete">🗑️ Supprimer</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PresseGeneraleManager;
