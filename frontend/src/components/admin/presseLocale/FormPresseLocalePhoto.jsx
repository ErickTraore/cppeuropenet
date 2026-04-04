import React, { useState, useRef } from 'react';
import { triggerFormatReset } from '../../../utils/formatController';

import { getPresseLocaleApiRoot, getPresseLocaleMediaApiRoot } from '../../../utils/presseLocaleApi';

const SITE_KEY = process.env.REACT_APP_PRESSE_LOCALE_SITE_KEY || 'cppEurope';

const FormPresseLocalePhoto = () => {
  const [newMessage, setNewMessage] = useState({
    title: '',
    content: '',
    image: null,
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
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setNewMessage((prevState) => ({ ...prevState, image: file }));
    }
  };

  const uploadImage = async (file, messageId) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('messageId', messageId);

    const response = await fetch(`${getPresseLocaleMediaApiRoot()}/uploadImage/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`❌ Erreur upload image: ${response.status}`);
    }
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error(
        '❌ Upload image : la réponse n’est pas du JSON (vérifiez le proxy /api/media-locale → mediaLocale :7008).'
      );
    }

    const data = await response.json();
    return data.filename || file.name;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newMessage.title || !newMessage.content || !newMessage.image) {
      setErrorMessage('⚠️ Titre, contenu et image sont obligatoires.');
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
      const messageResponse = await fetch(`${getPresseLocaleApiRoot()}/messages/new/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newMessage.title,
          content: newMessage.content,
          categ: 'presse-locale',
          siteKey: SITE_KEY,
        }),
      });

      if (!messageResponse.ok) {
        throw new Error(`❌ Erreur HTTP ${messageResponse.status}`);
      }

      const { id: newMessageId } = await messageResponse.json();

      let uploadedFilename = null;
      try {
        uploadedFilename = await uploadImage(newMessage.image, newMessageId);
      } catch (error) {
        console.error('⚠️ Erreur lors de l\'upload de l\'image:', error);
      }

      if (uploadedFilename) {
        try {
          const updateResponse = await fetch(`${getPresseLocaleApiRoot()}/messages/${newMessageId}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              attachment: uploadedFilename
            }),
          });

          if (!updateResponse.ok) {
            console.warn('⚠️ Impossible de mettre à jour l\'attachment');
          }
        } catch (error) {
          console.error('⚠️ Erreur lors de la mise à jour:', error);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 4000));

      setNewMessage({ title: '', content: '', image: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setErrorMessage('');

      setIsLoading(false);

      setSuccessMessage('✅ Article publié avec succès !');

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
    <form onSubmit={handleSubmit}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top-color: #333;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
      `}</style>
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

      <input
        type="file"
        name="image"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      <button type="button" onClick={() => fileInputRef.current?.click()}>
        📁 Sélectionner une photo
      </button>

      {newMessage.image && !isLoading && (
        <div style={{ marginTop: '10px' }}>
          <p>📷 Aperçu de l'image :</p>
          <img
            src={URL.createObjectURL(newMessage.image)}
            alt="Aperçu"
            style={{ maxWidth: '300px', maxHeight: '200px', border: '1px solid #ccc' }}
          />
        </div>
      )}

      {isLoading && (
        <div style={{
          marginTop: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px'
        }}>
          <span className="spinner" style={{
            width: '40px',
            height: '40px',
            borderWidth: '4px'
          }}></span>
          <p style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
            Upload de l'image en cours...
          </p>
        </div>
      )}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Envoi en cours...' : '📸 Publier'}
      </button>

      {errorMessage && (
        <p style={{ color: 'red' }}>
          <strong>{errorMessage}</strong>
        </p>
      )}

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
  );
};

export default FormPresseLocalePhoto;
