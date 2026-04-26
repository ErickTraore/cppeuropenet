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
  presseGenMessages: API_PRESSE_GEN,
  presseLocMessages: API_PRESSE_LOC_BASE,
  presseLocMessagesList: API_PRESSE_LOC_LIST,
} = require('./e2eApiUrls');

const E2E_ADMIN = { email: 'admin2026@cppeurope.net', password: 'admin2026!' };
const USERS_LOGIN = '/api/users/login';

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

/** Supprime un message presse générale par titre (login API, n’utilise pas la session navigateur). */
Cypress.Commands.add('cleanupPresseGeneraleByTitle', (titre) => {
  cy.request({
    method: 'POST',
    url: USERS_LOGIN,
    body: E2E_ADMIN,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const token = res.body.accessToken;
    cy.request({
      method: 'GET',
      url: API_PRESSE_GEN,
      headers: { Authorization: `Bearer ${token}` },
    }).then((r2) => {
      const messages = Array.isArray(r2.body) ? r2.body : [];
      const found = messages.find((m) => m.title === titre);
      if (found) {
        cy.request({
          method: 'DELETE',
          url: API_PRESSE_GEN + found.id,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((del) => {
          expect(del.status).to.be.oneOf([200, 204]);
        });
      }
    });
  });
});

/** Supprime un message presse locale par titre. */
Cypress.Commands.add('cleanupPresseLocaleByTitle', (titre) => {
  cy.request({
    method: 'POST',
    url: USERS_LOGIN,
    body: E2E_ADMIN,
  }).then((res) => {
    expect(res.status).to.eq(200);
    const token = res.body.accessToken;
    cy.request({
      method: 'GET',
      url: API_PRESSE_LOC_LIST,
      headers: { Authorization: `Bearer ${token}` },
    }).then((r2) => {
      const messages = Array.isArray(r2.body) ? r2.body : [];
      const found = messages.find((m) => m.title === titre);
      if (found) {
        cy.request({
          method: 'DELETE',
          url: API_PRESSE_LOC_BASE + found.id,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((del) => {
          expect(del.status).to.be.oneOf([200, 204]);
        });
      }
    });
  });
});

/** Création message presse générale (API directe, pour enchaîner upload média fiable côté Node). */
Cypress.Commands.add('apiCreatePresseGeneraleMessage', (token, titre, contenu, format = 'article') => {
  return cy
    .request({
      method: 'POST',
      url: `${API_PRESSE_GEN}new/`,
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

Cypress.Commands.add('apiUploadPresseGeneraleImage', (token, messageId, format = 'article-photo') => {
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
  });
});

Cypress.Commands.add('apiUploadPresseGeneraleVideo', (token, messageId, format = 'article-video') => {
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
  });
});

Cypress.Commands.add('apiCreatePresseLocaleMessage', (token, titre, contenu) => {
  return cy
    .request({
      method: 'POST',
      url: `${API_PRESSE_LOC_BASE}new/`,
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

Cypress.Commands.add('apiUploadPresseLocaleImage', (token, messageId) => {
  return cy.task('presseMediaUpload', {
    token,
    messageId,
    fieldName: 'image',
    fileName: 'e2e-1x1.png',
    mimeType: 'image/png',
    fixtureRelativePath: 'cypress/fixtures/e2e-1x1.png',
    port: 7008,
    apiPath: '/api/media-locale/uploadImage/',
  });
});

Cypress.Commands.add('apiUploadPresseLocaleVideo', (token, messageId) => {
  return cy.task('presseMediaUpload', {
    token,
    messageId,
    fieldName: 'video',
    fileName: 'video-e2e-valid-small.mp4',
    mimeType: 'video/mp4',
    fixtureRelativePath: 'cypress/fixtures/videos/video-e2e-valid-small.mp4',
    port: 7008,
    apiPath: '/api/media-locale/uploadVideo/',
  });
});
