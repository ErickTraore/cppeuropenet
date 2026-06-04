/**
 * Connexion UI alignée sur /#auth (Auth + Login).
 * Délai shell porté à 90s : après une longue suite e2e, user-backend / réseau peuvent dépasser 45s avant
 * que Redux affiche div.App.authenticated (specs 035–041). Pas d’intercept sur POST login : sous Cypress 15,
 * la forme du sujet cy.wait('@alias') ne fournit pas toujours response.statusCode de façon fiable.
 */
Cypress.Commands.add('loginByUi', (email, password, options = {}) => {
  const { clearStorage = true, shellTimeoutMs = 90000 } = options;
  cy.task('loginByApiNode', {
    email,
    password,
    timeoutMs: 12000,
    attempts: 8,
    delayMs: 2000,
  }).then((token) => {
    expect(token, 'token login API').to.be.a('string').and.not.be.empty;
    // Ensure frontend server.prod is reachable before visit to avoid transient ESOCKETTIMEDOUT.
    cy.task('checkFrontPing').should('eq', 'ok');
    cy.visit('/#auth', {
      timeout: shellTimeoutMs,
      onBeforeLoad(win) {
        if (clearStorage) {
          win.localStorage.clear();
          win.sessionStorage.clear();
        }
        win.localStorage.setItem('accessToken', token);
      },
    });
  });

  cy.window({ timeout: shellTimeoutMs }).should((win) => {
    expect(win.localStorage.getItem('accessToken'), 'accessToken après login API').to.be.a('string').and.not.be.empty;
  });
  cy.get('div.App.authenticated', { timeout: shellTimeoutMs }).should('exist');
});

Cypress.Commands.add('dismissSessionModalIfPresent', () => {
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="prolonger-session"]').length) {
      cy.get('[data-testid="prolonger-session"]').click();
    }
  });
});

/**
 * Shell connecté : Redux + menu + horloge alignés (régression : page admin visible sans menu/cadenas).
 */
Cypress.Commands.add('expectAuthenticatedShell', () => {
  cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
  cy.get('.App__header__actions__hamburger button').should('be.visible');
  cy.get('.App__header__actions__cadenas').should('be.visible');
  cy.get('nav.menu').should('exist');
  cy.window().should((win) => {
    expect(win.localStorage.getItem('accessToken'), 'accessToken présent').to.be.a('string').and.not.be.empty;
  });
});

const {
  usersApi: E2E_USERS_API,
  presseGenMessages: API_POLITIQUE,
  presseLocMessages: API_CULTUREL_BASE,
  presseLocMessagesList: API_CULTUREL_LIST,
} = require('./e2eApiUrls');

const E2E_ADMIN = { email: 'admin2026@cppeurope.net', password: 'admin2026!' };
const USERS_LOGIN = '/api/users/login';

function sameOriginApi(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = String(Cypress.config('baseUrl') || '').trim();
  try {
    const url = new URL(base);
    const host = String(url.hostname || '').toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost) {
      return `${url.origin}${p}`;
    }
  } catch {
  }
  const byEnv = String(Cypress.env('E2E_PROFILE') || '').toLowerCase() === 'staging';
  if (byEnv) {
    try {
      const origin = new URL(base).origin;
      return `${origin}${p}`;
    } catch {
      return p;
    }
  }
  return p;
}

/** Déplie la carte Consulter (titre + contenu) pour un article dont le titre est visible. */
Cypress.Commands.add('expandPresseConsultCardByTitle', (titre, options = {}) => {
  const timeout = options.timeout || 90000;
  cy.contains('.presse__message__header__title', titre, { timeout }).then(($t) => {
    let $card = $t
      .parents()
      .filter((_, el) => {
        const $el = Cypress.$(el);
        if ($el.hasClass('presse__message__header') || $el.hasClass('presse__message__textbar')) {
          return false;
        }
        return $el.find('> .presse__message__textbar, > .presse__message__header').length > 0;
      })
      .first();

    if (!$card.length) {
      $card = $t.closest(
        '.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video'
      );
    }

    expect($card.length, 'carte Consulter trouvée').to.be.greaterThan(0);

    if ($card.find('> .presse__message__textbar').length > 0) {
      cy.wrap($card).find('> .presse__message__textbar').first().click({ force: true });
      return;
    }

    cy.wrap($card).find('> .presse__message__header').first().click({ force: true });
  });
});

/** Supprime un message Politique par titre (login API, n’utilise pas la session navigateur). */
Cypress.Commands.add('cleanupPolitiqueByTitle', (titre) => {
  cy.request({
    method: 'POST',
    url: USERS_LOGIN,
    body: E2E_ADMIN,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const token = res.body.accessToken;
    cy.request({
      method: 'GET',
      url: API_POLITIQUE,
      headers: { Authorization: `Bearer ${token}` },
    }).then((r2) => {
      const messages = Array.isArray(r2.body) ? r2.body : [];
      const found = messages.find((m) => m.title === titre);
      if (found) {
        cy.request({
          method: 'DELETE',
          url: API_POLITIQUE + found.id,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((del) => {
          expect(del.status).to.be.oneOf([200, 204]);
        });
      }
    });
  });
});

/** Supprime un message Culturel par titre. */
Cypress.Commands.add('cleanupCulturelByTitle', (titre) => {
  cy.request({
    method: 'POST',
    url: USERS_LOGIN,
    body: E2E_ADMIN,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const token = res.body.accessToken;
    cy.request({
      method: 'GET',
      url: sameOriginApi('/api/presse-locale/messages/?categ=presse-locale&siteKey=cppEurope'),
      headers: { Authorization: `Bearer ${token}` },
    }).then((r2) => {
      const messages = Array.isArray(r2.body) ? r2.body : [];
      const found = messages.find((m) => m.title === titre);
      if (found) {
        cy.request({
          method: 'DELETE',
          url: sameOriginApi(`/api/presse-locale/messages/${found.id}`),
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((del) => {
          expect(del.status).to.be.oneOf([200, 204]);
        });
      }
    });
  });
});

/** Création message Politique (API directe, pour enchaîner upload média fiable côté Node). */
Cypress.Commands.add('apiCreatePolitiqueMessage', (token, titre, contenu, format = 'article') => {
  return cy
    .request({
      method: 'POST',
      url: `${API_POLITIQUE}new/`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: { title: titre, content: contenu, categ: 'presse', format },
    })
    .then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      return res.body.id;
    });
});

Cypress.Commands.add('apiUploadPolitiqueImage', (token, messageId, format = 'article-photo') => {
  return cy.task('presseMediaUpload', {
    token,
    messageId,
    format,
    fieldName: 'image',
    fileName: 'e2e-1x1.png',
    mimeType: 'image/png',
    fixtureRelativePath: 'cypress/fixtures/e2e-1x1.png',
    port: 7004,
    apiPath: '/api/media/uploadImage/',
    fullUrl: sameOriginApi('/api/media/uploadImage/'),
  });
});

Cypress.Commands.add('apiUploadPolitiqueVideo', (token, messageId, format = 'article-video') => {
  return cy.task('presseMediaUpload', {
    token,
    messageId,
    format,
    fieldName: 'video',
    fileName: 'video-e2e-valid-small.mp4',
    mimeType: 'video/mp4',
    fixtureRelativePath: 'cypress/fixtures/videos/video-e2e-valid-small.mp4',
    port: 7004,
    apiPath: '/api/media/uploadVideo/',
    fullUrl: sameOriginApi('/api/media/uploadVideo/'),
  });
});

Cypress.Commands.add('apiCreateCulturelMessage', (token, titre, contenu) => {
  return cy
    .request({
      method: 'POST',
      url: sameOriginApi('/api/presse-locale/messages/new/'),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: { title: titre, content: contenu, categ: 'presse-locale', siteKey: 'cppEurope' },
    })
    .then((res) => {
      expect(res.status).to.be.oneOf([200, 201]);
      return res.body.id;
    });
});

Cypress.Commands.add('apiUploadCulturelImage', (token, messageId, format = 'article-photo') => {
  return cy.task('presseMediaUpload', {
    token,
    messageId,
    format,
    fullUrl: sameOriginApi('/api/media-locale/uploadImage/'),
    fieldName: 'image',
    fileName: 'e2e-1x1.png',
    mimeType: 'image/png',
    fixtureRelativePath: 'cypress/fixtures/e2e-1x1.png',
    port: 7008,
    apiPath: '/api/media-locale/uploadImage/',
  });
});

Cypress.Commands.add('apiUploadCulturelVideo', (token, messageId, format = 'article-video') => {
  return cy.task('presseMediaUpload', {
    token,
    messageId,
    format,
    fullUrl: sameOriginApi('/api/media-locale/uploadVideo/'),
    fieldName: 'video',
    fileName: 'video-e2e-valid-small.mp4',
    mimeType: 'video/mp4',
    fixtureRelativePath: 'cypress/fixtures/videos/video-e2e-valid-small.mp4',
    port: 7008,
    apiPath: '/api/media-locale/uploadVideo/',
  });
});

// Aliases alignes sur les libelles metier reels.
Cypress.Commands.add('cleanupPresseGeneraleByTitle', (titre) => cy.cleanupPolitiqueByTitle(titre));
Cypress.Commands.add('cleanupPresseLocaleByTitle', (titre) => cy.cleanupCulturelByTitle(titre));
Cypress.Commands.add('apiCreatePresseGeneraleMessage', (token, titre, contenu, format = 'article') =>
  cy.apiCreatePolitiqueMessage(token, titre, contenu, format)
);
Cypress.Commands.add('apiUploadPresseGeneraleImage', (token, messageId, format = 'article-photo') =>
  cy.apiUploadPolitiqueImage(token, messageId, format)
);
Cypress.Commands.add('apiUploadPresseGeneraleVideo', (token, messageId, format = 'article-video') =>
  cy.apiUploadPolitiqueVideo(token, messageId, format)
);
Cypress.Commands.add('apiCreatePresseLocaleMessage', (token, titre, contenu) =>
  cy.apiCreateCulturelMessage(token, titre, contenu)
);
Cypress.Commands.add('apiUploadPresseLocaleImage', (token, messageId, format = 'article-photo') =>
  cy.apiUploadCulturelImage(token, messageId, format)
);
Cypress.Commands.add('apiUploadPresseLocaleVideo', (token, messageId, format = 'article-video') =>
  cy.apiUploadCulturelVideo(token, messageId, format)
);

const moduleRouteMap = {
  'presse-generale': {
    consulter: '/#newpresse',
    creer: '/#admin-presse-generale',
  },
  'presse-locale': {
    consulter: '/#newpresse-locale',
    creer: '/#admin-presse-locale',
  },
  politique: {
    consulter: '/#newpresse',
    creer: '/#admin-presse-generale',
  },
  culturel: {
    consulter: '/#newpresse-locale',
    creer: '/#admin-presse-locale',
  },
};

function resolveModuleRoute(moduleName, mode) {
  const moduleKey = String(moduleName || '').toLowerCase();
  const modeKey = String(mode || '').toLowerCase();
  const route = moduleRouteMap[moduleKey] && moduleRouteMap[moduleKey][modeKey];
  if (!route) {
    throw new Error(`Route introuvable pour module=${moduleName} mode=${mode}`);
  }
  return route;
}

Cypress.Commands.add('visitModuleConsulter', (moduleName) => {
  cy.visit(resolveModuleRoute(moduleName, 'consulter'));
});

Cypress.Commands.add('visitModuleCreer', (moduleName) => {
  cy.visit(resolveModuleRoute(moduleName, 'creer'));
});

Cypress.Commands.add('expectModuleRoute', (moduleName, mode) => {
  const route = resolveModuleRoute(moduleName, mode);
  cy.url({ timeout: 10000 }).should('include', route.replace('/#', ''));
});
