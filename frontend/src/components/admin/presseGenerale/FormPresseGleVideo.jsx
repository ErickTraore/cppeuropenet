// File: cppeurope/frontend/src/components/messages/presse/FormArticleVideo.jsx

import React, { useState, useRef } from 'react';
import { triggerFormatReset } from '../../../utils/formatController';
import { resolveApiUrl } from '../../../utils/apiUrls';
import { getPresseGeneraleMediaApiBase, parsePresseMessageIdFromCreateResponse } from '../../../utils/presseGeneraleMedia';

const USER_API = resolveApiUrl(process.env.REACT_APP_USER_API, 'http://localhost:7001/api/users', 'USER_API');
const PRESSE_GENERALE_API = resolveApiUrl(process.env.REACT_APP_PRESSE_GENERALE_API, USER_API, 'PRESSE_GENERALE_API');

const FormArticleVideo = ({ presseFormat = 'article-video' }) => {
  const [newMessage, setNewMessage] = useState({
    title: '',
    content: '',
    video: null,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setNewMessage({ ...newMessage, [e.target.name]: e.target.value });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewMessage((prevState) => ({ ...prevState, video: file }));
    }
  };

  const uploadVideo = async (file, messageId) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('messageId', String(messageId));
    formData.append('format', String(presseFormat || 'article-video'));

    const base = getPresseGeneraleMediaApiBase().replace(/\/$/, '');
    const uploadUrl = `${base}/uploadVideo/`;

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`❌ Erreur upload vidéo: ${response.status}`);
      }
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error(
          '❌ Upload vidéo : réponse non JSON (vérifiez mediaGle :7004 et le proxy /api/media).'
        );
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload de la vidéo:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newMessage.title || !newMessage.content || !newMessage.video) {
      setErrorMessage('⚠️ Titre, contenu et vidéo sont obligatoires.');
      return;
    }

    if (newMessage.content.length > 50000) {
      setErrorMessage('⚠️ Le contenu est trop volumineux (max 50000 caractères).');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const messageResponse = await fetch(`${PRESSE_GENERALE_API}/messages/new/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newMessage.title,
          content: newMessage.content,
          categ: 'presse',
          format: presseFormat,
        }),
      });


      if (!messageResponse.ok) {
        throw new Error(`❌ Erreur HTTP ${messageResponse.status}`);
      }

      const created = await messageResponse.json();
      const newMessageId = parsePresseMessageIdFromCreateResponse(created);
      if (newMessageId == null) {
        throw new Error('Réponse API presse invalide : id du message manquant après création.');
      }

      await uploadVideo(newMessage.video, newMessageId);

      // Garder le spinner au minimum 4 secondes pour l'UX
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Réinitialiser le formulaire
      setNewMessage({ title: '', content: '', video: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setErrorMessage('');
      
      // Arrêter le spinner
      setIsLoading(false);
      
      // Afficher le succès
      setSuccessMessage('✅ Article publié avec succès !');
      
      // Garder le message visible 3 secondes puis réinitialiser
      setTimeout(() => {
        setSuccessMessage('');
        triggerFormatReset();
      }, 3000);
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi:', error);
      setErrorMessage('⚠️ Une erreur est survenue lors de l\'envoi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="title"
        value={newMessage.title}
        onChange={handleInputChange}
        placeholder="Titre"
        required
      />
      <textarea
        name="content"
        value={newMessage.content}
        onChange={handleInputChange}
        placeholder="Contenu"
        required
      />

      {/* Champ natif masqué */}
      <input
        type="file"
        name="video"
        accept="video/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      {/* Bouton personnalisé */}
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        🎥 Sélectionner une vidéo
      </button>

      {/* Aperçu du fichier vidéo */}
      {newMessage.video && (
        <div style={{ marginTop: '10px' }}>
          <p>🎬 Vidéo sélectionnée :</p>
          <ul>
            <li><strong>Nom :</strong> {newMessage.video.name}</li>
            <li><strong>Taille :</strong> {(newMessage.video.size / 1024 / 1024).toFixed(2)} Mo</li>
          </ul>

          <video
            controls
            width="320"
            style={{ marginTop: '10px' }}
            src={URL.createObjectURL(newMessage.video)}
          />
        </div>
      )}


      <button type="submit" disabled={isLoading}>
        {isLoading ? '⏳ Envoi en cours...' : '📨 Publier'}
      </button>

      {isLoading && (
        <div>
          <div className="spinner" style={{ 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #3498db', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            animation: 'spin 1s linear infinite',
            margin: '10px auto'
          }}></div>
          <p style={{ marginTop: '10px', color: '#666', textAlign: 'center' }}>📤 Upload de la vidéo en cours...</p>
        </div>
      )}

      {errorMessage && <p style={{ color: 'red' }}><strong>{errorMessage}</strong></p>}
      
      {successMessage && (
        <p style={{ 
          color: 'green', 
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          padding: '12px',
          borderRadius: '4px',
          marginTop: '15px'
        }}>
          <strong>{successMessage}</strong>
        </p>
      )}
    </form>
    </>
  );
};

export default FormArticleVideo;
