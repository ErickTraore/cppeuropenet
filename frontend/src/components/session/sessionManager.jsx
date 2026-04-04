// File: frontend/src/components/session/SessionManager.jsx

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import Spinner from '../common/Spinner';
import { resolveApiUrl } from '../../utils/apiUrls';

const USER_API = resolveApiUrl(
  process.env.REACT_APP_USER_API,
  'http://localhost:7001/api/users',
  'USER_API'
);
const expiryWarning = parseInt(process.env.REACT_APP_SESSION_EXPIRY_WARNING, 10) || 60;

// Contexte pour partager timeLeft et l'état de phase session entre SessionManager et SessionTimer
const SessionContext = createContext({
  timeLeft: 0,
  setTimeLeft: () => {},
  switchToRealToken: () => {},
  isInitialSession: true,
  justLoggedIn: false,
});

export const useSessionTimer = () => {
  const context = useContext(SessionContext);
  return context?.timeLeft || 0;
};

// Provider à wrapper autour de App
export const SessionProvider = ({ children, isAuthenticated = false, accessToken = null }) => {
  const [timeLeft, setTimeLeft] = useState(0); // Démarre à 0 tant que non connecté
  const [isInitialSession, setIsInitialSession] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const prevAuthRef = useRef(false);
  const lastTokenRef = useRef(null);

  const getTokenRemainingTime = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return 0;
    try {
      const decoded = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
      if (!decoded.exp || typeof decoded.exp !== 'number') return 0;
      return decoded.exp - now;
    } catch {
      return 0;
    }
  };

  // Après login, démarrer à 80s puis attendre la prolongation
  useEffect(() => {
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated) {
      lastTokenRef.current = null;
      setTimeLeft(0);
      setIsInitialSession(true);
      setJustLoggedIn(false);
      return;
    }

    // Ne réinitialiser le timer qu'en cas de login effectif (pas navigation)
    if (isAuthenticated && !wasAuth) {
      lastTokenRef.current = accessToken; // Éviter de confondre avec une prolongation au prochain render
      setIsInitialSession(true);
      setJustLoggedIn(true);
      setTimeLeft(expiryWarning); // 60s après login
      sessionStorage.setItem('sessionJustLoggedIn', '1'); // Flag pour modale (SessionManager)
    }

    // Prolongation uniquement : token change alors qu'on était déjà connecté (PAS au premier login)
    if (isAuthenticated && wasAuth && accessToken && accessToken !== lastTokenRef.current) {
      lastTokenRef.current = accessToken;
      setIsInitialSession(false); // Prolongation : passe à la vraie durée
      setJustLoggedIn(false);
      setTimeLeft(getTokenRemainingTime()); // Passe à la vraie durée uniquement après prolongation
      sessionStorage.removeItem('sessionJustLoggedIn');
    }
  }, [isAuthenticated, accessToken]);

  // Timer 80s après login/prolongation
  useEffect(() => {
    if (!isAuthenticated) return;
    if (isInitialSession && justLoggedIn) {
      setTimeLeft(expiryWarning);
      let current = expiryWarning;
      const timer = setInterval(() => {
        current -= 1;
        setTimeLeft(current);
        if (current <= 0) {
          clearInterval(timer);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isInitialSession, justLoggedIn, isAuthenticated]);

  // Après prolongation, afficher la vraie durée du token
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isInitialSession && !justLoggedIn) {
      const updateTimeLeft = () => {
        const remaining = getTokenRemainingTime();
        setTimeLeft(remaining > 0 ? remaining : 0);
      };
      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialSession, justLoggedIn, isAuthenticated]);

  // Méthode à appeler après "Prolonger"
  const switchToRealToken = () => {
    setIsInitialSession(false);
    setJustLoggedIn(false);
  };

  return (
    <SessionContext.Provider
      value={{ timeLeft, setTimeLeft, switchToRealToken, isInitialSession, justLoggedIn }}
    >
      {children}
    </SessionContext.Provider>
  );
};

const SessionManager = () => {
  const dispatch = useDispatch();
  const context = useContext(SessionContext);
  const timeLeft = context?.timeLeft || 0;
  const isInitialSession = context?.isInitialSession ?? true;
  const justLoggedIn = context?.justLoggedIn ?? false;
  const sessionCtxRef = useRef(context);
  sessionCtxRef.current = context;
  const [showModal, setShowModal] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const hasInitialized = useRef(false);

  // Composant inline pour le cadenas/timer visuel (déplacé hors de handleLogout)
  const VisualTimer = ({ timeLeft, onLogout }) => {
    let color = '#4caf50'; // vert
    let iconClass = 'fa-lock-open';
    if (timeLeft <= 20 && timeLeft > 5) {
      color = '#ff9800'; // orange
    } else if (timeLeft <= 5) {
      color = '#f44336'; // rouge
      iconClass = 'fa-lock';
    }
    return (
      <div
        className="App__header__actions__cadenas"
        onClick={onLogout}
      >
        <i
          className={`App__header__actions__cadenas__icon fas ${iconClass}`}
          style={{ color }}
        />
        <span
          className="App__header__actions__cadenas__timer"
          style={{ color }}
        >
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </span>
      </div>
    );
  };

  const handleLogout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('sessionJustLoggedIn');
    window.location.hash = 'auth';
    window.location.reload();
  }, [dispatch]);

  // Prolongation : même logique pour le bouton « Prolonger » et pour la fin du compte à rebours modale.
  const handleExtend = useCallback(async () => {
    console.log('🟡 Tentative de prolongation de session...');
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('🔑 refreshToken récupéré :', refreshToken);
    if (!refreshToken) {
      console.warn('❌ Aucun refreshToken trouvé, déconnexion...');
      return handleLogout();
    }

    setIsExtending(true);

    try {
      const response = await fetch(`${USER_API}/extend-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`
        }
      });

      console.log('📡 Réponse reçue du backend :', response);
      const data = await response.json();
      console.log('📦 Contenu JSON reçu :', data);

      if (!response.ok || !data.accessToken) {
        console.warn('❌ Token non reçu ou réponse invalide, déconnexion...');
        return handleLogout();
      }

      localStorage.setItem('accessToken', data.accessToken);
      console.log('✅ Nouveau accessToken stocké :', data.accessToken);

      dispatch({ type: 'LOGIN_SUCCESS', payload: data.accessToken });

      // 🔄 Réinitialiser immédiatement à 30 min (vraie durée du token, pas 60s restant + 30min)
      const remaining = (() => {
        try {
          const decoded = jwtDecode(data.accessToken);
          const now = Math.floor(Date.now() / 1000);
          return decoded?.exp && typeof decoded.exp === 'number' ? Math.max(0, decoded.exp - now) : 0;
        } catch {
          return 0;
        }
      })();
      const ctx = sessionCtxRef.current;
      ctx?.switchToRealToken?.(); // Passe en mode "durée réelle" avant setTimeLeft
      ctx?.setTimeLeft?.(remaining);

      setShowModal(false);
      setIsExtending(false);
      console.log('🟢 Session prolongée avec succès, timer réinitialisé à 30 min.');
    } catch (err) {
      console.error('❌ Erreur lors de la requête de prolongation :', err);
      setIsExtending(false);
      handleLogout();
    }
  }, [dispatch, handleLogout]);

  /** Évite de lancer deux prolongations si l’effet se ré-exécute pendant l’async. */
  const modalExpiryHandledRef = useRef(false);

  // Afficher la modale immédiatement après login (le Provider gère le timer 80s)
  useEffect(() => {
    const sessionJustLoggedIn = sessionStorage.getItem('sessionJustLoggedIn') === '1';
    const hash = window.location.hash.slice(1);
    const isAuthPage = hash === 'auth';
    if (sessionJustLoggedIn && !hasInitialized.current && !isAuthPage) {
      hasInitialized.current = true;
      setShowModal(true);
      sessionStorage.removeItem('sessionJustLoggedIn');
      console.log('🔔 Modale de session affichée (timer 80s géré par SessionProvider)');
    }
  }, []);

  // « Redirection » / reset ressenti après un long upload : ici le compte à rebours de la modale (≈60 s)
  // atteint 0 pendant que l’utilisateur n’a pas cliqué « Prolonger » → handleLogout() mettait #auth + reload.
  // On tente d’abord une prolongation silencieuse (refresh token), comme si l’utilisateur avait cliqué.
  useEffect(() => {
    if (!showModal) {
      modalExpiryHandledRef.current = false;
      return;
    }
    if (timeLeft > 0) return;
    if (modalExpiryHandledRef.current) return;
    modalExpiryHandledRef.current = true;

    void handleExtend();
  }, [showModal, timeLeft, handleExtend]);

  // 🔁 Déconnexion automatique lorsque le timer "réel" (≈30 min) arrive à 0
  // Sans cliquer sur quoi que ce soit, on reproduit le comportement du timer 80s :
  // redirection vers /#auth via handleLogout.
  // On se limite aux cas où la modale n'est pas affichée ET où on est en phase "réelle" (après prolongation)
  // pour ne pas perturber la phase initiale 80s ni le montage initial.
  useEffect(() => {
    if (!showModal && !isInitialSession && !justLoggedIn && timeLeft <= 0) {
      handleLogout();
    }
  }, [showModal, isInitialSession, justLoggedIn, timeLeft, handleLogout]);

  return (
    <>
      {/* VisualTimer placé dans le header (via App) sans texte supplémentaire */}
      <VisualTimer timeLeft={timeLeft} onLogout={handleLogout} />
      {showModal && (
        <div style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fff',
          padding: '20px',
          border: '2px solid #333',
          zIndex: 1000
        }}>
          <p>⏰ Votre session va expirer.</p>
          <p style={{ fontWeight: 'bold', color: 'red' }}>
            Déconnexion automatique dans : {timeLeft} secondes
          </p>
          <button type="button" onClick={handleExtend} disabled={isExtending} data-testid="prolonger-session" aria-label="Prolonger la session">
            {isExtending ? <Spinner size="small" inline={true} /> : 'Prolonger'}
          </button>
          <button onClick={handleLogout}>Déconnecter</button>
        </div>
      )}
    </>
  );
};

export default SessionManager;
