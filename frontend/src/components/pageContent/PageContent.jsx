// File: frontend/src/components/pageContent/PageContent.jsx

import React from 'react';
import Auth from '../auth/Auth';
import Register from '../register/Register';
import '../pageContent/PageContent.css';
import Home from '../home/Home';
import ContactForm from '../contactForm/ContactForm';
import Login from '../login/Login';
import PresseGeneraleManager from '../presseGenerale/PresseGeneraleManager';
import PresseGeneraleConsulter from '../presseGenerale/PresseGeneraleConsulter';
import PresseGeneraleCreer from '../presseGenerale/PresseGeneraleCreer';
import PresseLocaleManager from '../presseLocale/PresseLocaleManager';
import PresseLocaleConsulter from '../presseLocale/PresseLocaleConsulter';
import PresseLocaleCreer from '../presseLocale/PresseLocaleCreer';
import ProfilePage from '../profilepage/ProfilePage';
import AdminHomeConfig from '../admin/AdminHomeConfig';

const PageContent = React.memo(({ activePage }) => {
  return (
    <div className="content" key={activePage}>
      {activePage === 'home' && <Home />}
      {activePage === 'admin-home-config' && <AdminHomeConfig />}
      {activePage === 'auth' && <Auth />}
      {activePage === 'register' && <Register />}
      {activePage === 'contact' && <ContactForm />}
      {activePage === 'login' && <Login />}

      {activePage === 'presse-generale' && <PresseGeneraleManager />}  {/* Gérer presse générale */}
      {activePage === 'newpresse' && <PresseGeneraleConsulter />}    {/* Consulter presse générale */}
      {(activePage === 'admin-presse-generale' || activePage === 'admin-presse-générale') && <PresseGeneraleCreer />}   {/* Créer presse générale */}

      {activePage === 'presse-locale' && <PresseLocaleManager />}  {/* Gérer presse locale */}
      {activePage === 'newpresse-locale' && <PresseLocaleConsulter />}    {/* Consulter presse locale */}
      {activePage === 'admin-presse-locale' && <PresseLocaleCreer />}   {/* Créer presse locale */}

      {activePage === 'profilepage' && <ProfilePage />}
    </div>
  );
});

export default PageContent;
