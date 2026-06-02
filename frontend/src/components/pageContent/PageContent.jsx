// File: frontend/src/components/pageContent/PageContent.jsx

import React from 'react';
import Auth from '../auth/Auth';
import Register from '../register/Register';
import '../pageContent/PageContent.css';
import Home from '../home/Home';
import ContactForm from '../contactForm/ContactForm';
import Login from '../login/Login';
import ProfilePage from '../profilepage/ProfilePage';
import AdminHomeConfig from '../admin/AdminHomeConfig';
import PresseGeneraleManager from '../presseGenerale/PresseGeneraleManager';
import PresseGeneraleConsulter from '../presseGenerale/PresseGeneraleConsulter';
import PresseGeneraleCreer from '../presseGenerale/PresseGeneraleCreer';
import PresseLocaleManager from '../presseLocale/PresseLocaleManager';
import PresseLocaleConsulter from '../presseLocale/PresseLocaleConsulter';
import PresseLocaleCreer from '../presseLocale/PresseLocaleCreer';

const PageContent = React.memo(({ activePage }) => {
  return (
    <div className="content" key={activePage}>
      {activePage === 'home' && <Home />}
      {activePage === 'admin-home-config' && <AdminHomeConfig />}
      {activePage === 'auth' && <Auth />}
      {activePage === 'register' && <Register />}
      {activePage === 'contact' && <ContactForm />}
      {activePage === 'login' && <Login />}

      {activePage === 'presse-generale' && <PresseGeneraleManager />}
      {activePage === 'newpresse' && <PresseGeneraleConsulter />}
      {(activePage === 'admin-presse-generale' || activePage === 'admin-presse-générale') && <PresseGeneraleCreer />}

      {activePage === 'presse-locale' && <PresseLocaleManager />}
      {activePage === 'newpresse-locale' && <PresseLocaleConsulter />}
      {activePage === 'admin-presse-locale' && <PresseLocaleCreer />}

      {activePage === 'profilepage' && <ProfilePage />}
    </div>
  );
});

export default PageContent;
