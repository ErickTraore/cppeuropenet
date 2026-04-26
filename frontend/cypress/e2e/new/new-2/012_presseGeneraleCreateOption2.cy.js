/**
 * Presse générale — option 2 (photo) : parcours réel UI (upload → succès → getMedia même origine → Consulter + pixels).
 * Renommage API final pour la chaîne 013_delete (« titre remplacé Option2 »).
 */
describe('012 - Presse Générale - Create (option 2: UI photo + Consulter)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const { usersApi, presseGenMessages } = require('../../../support/e2eApiUrls');
  const apiMessages = presseGenMessages;
  const contenu =
    'E2E Contenu article avec photo. Texte suffisamment long pour les limites backend.';
  const titreRemplace = 'titre remplacé Option2';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";

  const makeUniqueTitle = () => `E2E UI Photo Presse ${Date.now()}-${Cypress._.random(1000, 9999)}`;

  const fetchMessageByIdWithRetry = (token, messageId, attemptsLeft = 8) => {
    return cy
      .request({
        method: 'GET',
        url: apiMessages,
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => Number(m.id) === Number(messageId));
        if (found) return found;
        if (attemptsLeft <= 1) {
          throw new Error(`message id=${messageId} introuvable après retries`);
        }
        return cy.wait(700).then(() => fetchMessageByIdWithRetry(token, messageId, attemptsLeft - 1));
      });
  };

  /**
   * Attend que le titre soit visible dans la liste Consulter.
   * cy.contains() retente automatiquement jusqu'au timeout — pas besoin de reload manuel.
   * La session est déjà fraîche (re-login juste avant cy.visit).
   */
  const waitForTitleInConsulter = (expectedTitle) => {
    cy.dismissSessionModalIfPresent();
    // Attendre qu'au moins un article soit rendu (fetch Redux terminé)
    cy.get('.presse__message__header__title', { timeout: 30000 }).should('exist');
    cy.dismissSessionModalIfPresent();
    // Vérifier que notre titre spécifique est dans la liste
    cy.contains('.presse__message__header__title', expectedTitle, { timeout: 10000 }).then(() => {
      cy.task('log', `[012][consulter] titre visible: "${expectedTitle}"`);
    });
  };

  beforeEach(() => {
    cy.task('assertE2EInfrastructure').should('eq', 'e2e-ready');
    cy.task('checkFrontPing').should('eq', 'ok');

    cy.request({
      method: 'POST',
      url: `${usersApi}/login`,
      body: { email: adminEmail, password: adminPassword },
    }).then((res) => {
      expect(res.status, 'login cleanup pre-test').to.eq(200);
      const token = res.body && res.body.accessToken;
      expect(token, 'token cleanup pre-test').to.be.a('string').and.not.be.empty;

      cy.request({
        method: 'GET',
        url: apiMessages,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((listRes) => {
        if (listRes.status === 403) {
          cy.task('log', '[012][cleanup] Skip: token user-backend non accepté par presseGenerale-backend');
          return;
        }

        expect(listRes.status, 'list before cleanup pre-test').to.eq(200);
        const messages = Array.isArray(listRes.body) ? listRes.body : [];
        const duplicates = messages.filter((m) => m.title === titreRemplace);
        cy.task('log', `[012][cleanup] ${duplicates.length} entrée(s) préexistante(s) pour "${titreRemplace}"`);

        if (duplicates.length === 0) return;
        cy.wrap(duplicates).each((msg) => {
          cy.request({
            method: 'DELETE',
            url: apiMessages + msg.id,
            headers: { Authorization: `Bearer ${token}` },
            failOnStatusCode: false,
          }).then((delRes) => {
            expect(delRes.status, 'delete duplicate pre-test').to.be.oneOf([200, 204]);
          });
        });
      });
    });
  });

  after(() => {
    cy.cleanupPresseGeneraleByTitle(titreRemplace);
  });

  it('publie article+photo, getMedia OK via proxy, image visible sous Consulter, puis titre pour 013', () => {
    const titre = makeUniqueTitle();
    cy.task('log', `[012][start] titre="${titre}"`);

    cy.intercept('POST', '**/api/messages/new*').as('apiCreateMessage');
    // Upload réel vers mediaGle local (docker-compose.e2e.env : PRESSE_MEDIA_GLE_HOST=host.docker.internal:7004).
    cy.intercept('POST', '**/api/media/uploadImage/**').as('apiUploadImage');

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-presse-generale');
    cy.get('#format', { timeout: 20000 }).select('article-photo');
    cy.get('input[name="title"]').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.get('input[type="file"][name="image"]').selectFile('cypress/fixtures/e2e-1x1.png', { force: true });
    cy.task('log', '[012][publish] click Publier');
    cy.contains('button', '📸 Publier').click();

    cy.wait('@apiCreateMessage', { timeout: 120000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      const body = interception && interception.response ? interception.response.body : null;
      cy.task('log', `[012][apiCreateMessage] status=${status}`);
      expect(status, 'POST /api/messages/new').to.be.oneOf([200, 201]);
      const createdId = body && body.id ? body.id : null;
      if (createdId) {
        cy.wrap(createdId).as('createdMessageId');
        cy.task('log', `[012][apiCreateMessage] id=${createdId}`);
      }
    });

    cy.wait('@apiUploadImage', { timeout: 60000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      cy.task('log', `[012][apiUploadImage] status=${status} (upload réel → mediaGle local:7004)`);
      expect(status, 'POST /api/media/uploadImage → mediaGle local').to.be.oneOf([200, 201]);
    });

    cy.get('@createdMessageId').then((createdMessageId) => {
      expect(createdMessageId, 'id message créé').to.exist;
    });

    cy.get('body', { timeout: 10000 }).then(($body) => {
      const hasToast = String($body.text() || '').includes('Article publié avec succès');
      cy.task('log', `[012][publish] success-toast-visible=${hasToast ? 'yes' : 'no'}`);
    });
    cy.task('log', '[012][publish] publication validée par API (toast optionnel)');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      const origin = win.location.origin;
      expect(token).to.be.a('string').and.not.be.empty;
      cy.get('@createdMessageId').then((createdMessageId) => {
        cy.task('log', `[012][apiMessages] using created id=${createdMessageId}`);
        return cy
          .request({
            url: `${origin}/api/media/getMedia/${createdMessageId}`,
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((gm) => {
            cy.task('log', `[012][getMedia] status=${gm.status} id=${createdMessageId} body.length=${Array.isArray(gm.body) ? gm.body.length : 'n/a'}`);
            expect(gm.status, 'getMedia via même origine (proxy → mediaGle local)').to.eq(200);
            expect(gm.body.length, 'getMedia retourne au moins 1 media').to.be.greaterThan(0);
          });
      });
    });

    // Pas de stubs : getMedia et fichiers images vont vers mediaGle local via proxy.
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();
    cy.visit('/#newpresse');
    cy.dismissSessionModalIfPresent();
    waitForTitleInConsulter(titre);

    cy.get('body', { timeout: 90000 }).should(($body) => {
      const $title = $body.find('.presse__message__header__title').filter((_, el) => (el.textContent || '').trim() === titre);
      expect($title.length, 'titre présent dans Consulter').to.be.greaterThan(0);

      const $card = $title
        .last()
        .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video');
      expect($card.length, 'carte Consulter trouvée').to.be.greaterThan(0);

      const $img = $card.find('img.presse__message__media__img:visible');
      expect($img.length, 'image visible dans la carte').to.be.greaterThan(0);
      expect($img[0].naturalWidth, 'image décodée').to.be.greaterThan(0);
    });

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      cy.get('@createdMessageId').then((createdMessageId) => {
        fetchMessageByIdWithRetry(token, createdMessageId).then((found) => {
          cy.task('log', `[012][rename] id=${found.id} -> "${titreRemplace}"`);
          cy.request({
            method: 'PUT',
            url: apiMessages + found.id,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: { ...found, title: titreRemplace, content: contenuRemplace },
          }).then((putRes) => {
            cy.task('log', `[012][rename] status=${putRes.status}`);
            expect(putRes.status).to.eq(200);
          });
        });
      });
    });
  });
});
