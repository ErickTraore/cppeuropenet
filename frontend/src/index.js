// File: frontend/src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import store from './store';
import './index.css';
import App from './app/App';
import reportWebVitals from './reportWebVitals';

// Aligner Redux avec le token persistant : sans ça, après F5 / reload le menu et l’horloge
// disparaissent (isAuthenticated false) alors que localStorage contient encore accessToken.
const persistedToken = localStorage.getItem('accessToken');
if (persistedToken) {
  store.dispatch({ type: 'LOGIN_SUCCESS', payload: persistedToken });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}> 
      <BrowserRouter>
        <App /> 
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();

