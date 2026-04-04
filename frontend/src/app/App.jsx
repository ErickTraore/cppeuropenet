// File: lespremices/frontend/src/app/App.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import '../styles/main.scss';
import HamburgerIcon from '../components/hamburgerIcon/HamburgerIcon';
import PageContent from '../components/pageContent/PageContent';
import logo from '../assets/logoppaci514_150x151.png';
import panneau150 from '../assets/original/banniere-150x21.png'
import panneau200 from '../assets/original/banniere-200x28.png';
import panneau320 from '../assets/original/banniere-320x44.png';
import panneau375 from '../assets/original/banniere-375x52.png';
import panneau425 from '../assets/original/banniere-425x59.png';
import panneau768 from '../assets/original/banniere-768x107.png';
import panneau1024 from '../assets/original/banniere-1024x142.png';
import panneau1536 from '../assets/original/banniere-1440x200.png';
import Footer from '../components/footer/Footer';
import './App.css';
import SessionManager, { SessionProvider } from '../components/session/sessionManager.jsx';
import { jwtDecode } from 'jwt-decode';

// ✅ Fonction de déconnexion
export const handleLogout = (dispatch) => {
  localStorage.removeItem("accessToken");
  dispatch({ type: "LOGOUT" });
  window.location.hash = 'auth';
  window.location.reload();
};

function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [isOpen, setIsOpen] = useState(false);
  // ✅ Initialiser activePage depuis le hash, pas par défaut à 'auth'
  // ✅ Décoder l'URL (les accents comme 'é' deviennent '%C3%A9')
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.slice(1);
    try {
      return decodeURIComponent(hash) || 'auth';
    } catch (e) {
      return hash || 'auth';
    }
  });
  const [, setPanneau] = useState(panneau1536); // valeur par défaut (panneau responsive non affiché)
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const token = localStorage.getItem("accessToken");

  // PageContent affiche admin-presse-generale dès le hash, sans regarder Redux. Si le store perd
  // isAuthenticated alors qu'un accessToken est encore présent (désync), le menu / horloge disparaissent
  // tout en laissant cette page — comme sur ta capture. On réaligne le store sur le token.
  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (t && !isAuthenticated) {
      dispatch({ type: 'LOGIN_SUCCESS', payload: t });
    }
  }, [isAuthenticated, dispatch]);
  
  // ✅ Memoïser le décodage du token pour éviter de recréer l'objet à chaque render
  const decodedUser = useMemo(() => {
    return token ? jwtDecode(token) : null;
  }, [token]);
  
  const isAdmin = decodedUser?.isAdmin === true;

  // ✅ Fonction centralisée
  const updatePanneau = () => {
    const width = window.innerWidth;
    if (width <= 150) {
      setPanneau(panneau150);
    } else if (width <= 200) {
      setPanneau(panneau200);
    } else if (width <= 320) {
      setPanneau(panneau320);
    } else if (width <= 375) {
      setPanneau(panneau375);
    } else if (width <= 425) {
      setPanneau(panneau425);
    } else if (width <= 768) {
      setPanneau(panneau768);
    } else if (width <= 1024) {
      setPanneau(panneau1024);
    } else {
      setPanneau(panneau1536);
    }
  };

  // ✅ Initialisation + resize
  useEffect(() => {
    updatePanneau();
    window.addEventListener('resize', updatePanneau);

    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        setActivePage(decodeURIComponent(hash));
      } catch (e) {
        setActivePage(hash);
      }
    }

    return () => {
      window.removeEventListener('resize', updatePanneau);
    };
  }, []);

  // ✅ Écouter les changements de hash (utile pour Cypress et back/forward du navigateur)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      try {
        const decodedHash = decodeURIComponent(hash);
        if (decodedHash) setActivePage(decodedHash);
      } catch (e) {
        if (hash) setActivePage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navigateTo = (page) => {
    setActivePage(page);
    setIsOpen(false);
    window.location.hash = page;
  };

  const toggleSubmenu = (key) => {
    setOpenSubmenu((prev) => (prev === key ? null : key));
  };

  // Menu dynamique (structure alignée ppacilyoncentre) : Presse Générale / Presse Locale avec sous-menus admin
  const menuItems = useMemo(() => {
    const presseGenerale = isAdmin
      ? {
          key: 'presse-generale',
          label: 'Presse Générale',
          defaultKey: 'presse-generale',
          children: [
            { key: 'presse-generale', label: 'Gérer' },
            { key: 'newpresse', label: 'Consulter' },
            { key: 'admin-presse-generale', label: 'Créer' },
          ],
        }
      : { key: 'newpresse', label: 'Presse Générale' };

    const presseLocale = isAdmin
      ? {
          key: 'presse-locale',
          label: 'Presse Locale',
          defaultKey: 'presse-locale',
          children: [
            { key: 'presse-locale', label: 'Gérer' },
            { key: 'newpresse-locale', label: 'Consulter' },
            { key: 'admin-presse-locale', label: 'Créer' },
          ],
        }
      : { key: 'newpresse-locale', label: 'Presse Locale' };

    return [
      { key: 'home', label: 'Home' },
      presseGenerale,
      presseLocale,
      { key: 'contact', label: 'Contact' },
      { key: 'profilepage', label: 'ProfilePage' },
    ];
  }, [isAdmin]);

  const isMenuItemActive = (item) => {
    if (item.key === activePage) return true;
    return item.children?.some((child) => child.key === activePage) ?? false;
  };

  useEffect(() => {
    const activeGroup = menuItems.find((item) =>
      item.children?.some((child) => child.key === activePage)
    );
    if (activeGroup) {
      setOpenSubmenu(activeGroup.key);
    }
  }, [activePage, menuItems]);

  const renderMenuItems = () =>
    menuItems.map((item) => {
      const hasChildren = Array.isArray(item.children) && item.children.length > 0;
      const isActive = isMenuItemActive(item);

      if (!hasChildren) {
        return (
          <li key={item.key} className={`menu__card ${isActive ? 'active' : ''}`}>
            <button type="button" className="menu-link" onClick={() => navigateTo(item.key)}>
              {item.label}
            </button>
          </li>
        );
      }

      return (
        <li
          key={item.key}
          className={`menu__card has-submenu ${isActive ? 'active' : ''} ${openSubmenu === item.key ? 'open' : ''}`}
        >
          <div className="menu-item">
            <button
              type="button"
              className="menu-link"
              onClick={() => navigateTo(item.defaultKey || item.children[0].key)}
            >
              {item.label}
            </button>
            <button
              type="button"
              className="submenu-toggle"
              aria-expanded={openSubmenu === item.key}
              onClick={(event) => {
                event.stopPropagation();
                toggleSubmenu(item.key);
              }}
            >
              {openSubmenu === item.key ? '▲' : '▼'}
            </button>
          </div>
          <ul className="submenu">
            {item.children.map((child) => (
              <li key={child.key} className={activePage === child.key ? 'active' : ''}>
                <button
                  type="button"
                  className="submenu-link"
                  onClick={() => navigateTo(child.key)}
                >
                  {child.label}
                </button>
              </li>
            ))}
          </ul>
        </li>
      );
    });

  return (
    <SessionProvider isAuthenticated={isAuthenticated} accessToken={token}>
      <div className={`App ${isAuthenticated ? 'authenticated' : 'not-authenticated'}`}>
      <header className="App__header">
        <div className="App__header__logo">
          <img src={logo} alt="logo" className="App__header__logo__img" />
        </div>

        <div className="App__header__panneau">
          <p className="App__header__panneau__text-1">
            Parti des Peuples Africains
          </p>
          <p className="App__header__panneau__text-2">
            Conseil Politique Permanent Europe
          </p>
        </div>

        <div className="App__header__actions">
          {isAuthenticated && <SessionManager />}
          <div className="App__header__actions__hamburger">
            {isAuthenticated && (
              <HamburgerIcon isOpen={isOpen} toggleMenu={toggleMenu} />
            )}
          </div>
        </div>
      </header>

      {isAuthenticated && (
        <nav className={`menu ${isOpen ? 'open' : ''}`} aria-label="Menu principal">
          <ul className="menu__list">
            {renderMenuItems()}
          </ul>
        </nav>
      )}

      {isAuthenticated && (
        <ul className="horizontal-menu">
          {menuItems.map((item) => (
            <li key={item.key} className={isMenuItemActive(item) ? 'active' : ''}>
              <a href={`#${item.key}`} onClick={(e) => { e.preventDefault(); navigateTo(item.defaultKey || item.key); }}>{item.label}</a>
            </li>
          ))}
        </ul>
      )}

      <PageContent activePage={activePage} isAuthenticated={isAuthenticated} />
      <Footer />
    </div>
    </SessionProvider>
  );
}

export default App;
