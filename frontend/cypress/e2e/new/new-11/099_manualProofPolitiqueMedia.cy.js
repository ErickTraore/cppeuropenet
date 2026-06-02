describe('099 - Preuve manuelle consulter politique avec media visible', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const { presseGenMessages } = require('../../../support/e2eApiUrls');
  const contenu = 'Preuve manuelle: media visible sur consulter politique.';

  const createPresseMessageWithRetry = (token, title, content, format = 'article-photo', attemptsLeft = 2) => {
    return cy
      .request({
        method: 'POST',
        url: `${presseGenMessages}new/`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: { title, content, categ: 'presse', format },
        failOnStatusCode: false,
      })
      .then((res) => {
        if ([200, 201].includes(res.status) && res.body && Number(res.body.id) > 0) {
          return Number(res.body.id);
        }
        if (attemptsLeft <= 1) {
          expect(res.status, 'POST /api/messages/new (099)').to.be.oneOf([200, 201]);
          return null;
        }
        cy.task('log', `[099][create] status=${res.status}; retry`);
        return cy.wait(900).then(() => createPresseMessageWithRetry(token, title, content, format, attemptsLeft - 1));
      });
  };

  const waitForMessageAndMediaReady = (token, messageId, origin, attemptsLeft = 8) => {
    return cy
      .request({
        method: 'GET',
        url: `${presseGenMessages}`,
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((listRes) => {
        const rows = Array.isArray(listRes.body) ? listRes.body : [];
        const found = rows.some((m) => Number(m.id) === Number(messageId));
        if (!found) {
          if (attemptsLeft <= 1) throw new Error(`[099] message introuvable id=${messageId}`);
          return cy.wait(800).then(() => waitForMessageAndMediaReady(token, messageId, origin, attemptsLeft - 1));
        }

        return cy
          .request({
            method: 'GET',
            url: `${origin}/api/media/getMedia/${messageId}`,
            headers: { Authorization: `Bearer ${token}` },
            failOnStatusCode: false,
          })
          .then((gm) => {
            const ready = gm.status === 200 && Array.isArray(gm.body) && gm.body.length > 0;
            if (ready) return;
            if (attemptsLeft <= 1) {
              expect(gm.status, 'GET /api/media/getMedia/:id (099)').to.eq(200);
              expect(Array.isArray(gm.body) ? gm.body.length : 0, 'media rows (099)').to.be.greaterThan(0);
              return;
            }
            return cy.wait(800).then(() => waitForMessageAndMediaReady(token, messageId, origin, attemptsLeft - 1));
          });
      });
  };

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 16) => {
    cy.dismissSessionModalIfPresent();
    cy.get('.presse__message__header__title', { timeout: 30000 }).should('exist');
    return cy.get('body', { timeout: 10000 }).then(($body) => {
      const exists = $body
        .find('.presse__message__header__title')
        .toArray()
        .some((el) => (el.textContent || '').trim() === expectedTitle);
      if (exists) return;
      if (attemptsLeft <= 1) {
        throw new Error(`titre introuvable dans Consulter: ${expectedTitle}`);
      }
      cy.wait(1500);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  it('publie un article photo puis vérifie son affichage public', () => {
    const titre = `MANUAL-PROOF-PHOTO-${Date.now()}-${Cypress._.random(1000, 9999)}`;

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      const origin = win.location.origin;
      expect(token, 'token présent après login').to.be.a('string').and.not.be.empty;
      return createPresseMessageWithRetry(token, titre, contenu, 'article-photo').then((id) => {
        expect(id, 'id message créé').to.be.a('number').and.to.be.greaterThan(0);
        return cy.apiUploadPolitiqueImage(token, id, 'article-photo').then(() => {
          return waitForMessageAndMediaReady(token, id, origin);
        });
      });
    });

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();
    cy.visitModuleConsulter('politique');
    waitForTitleInConsult(titre);
    cy.dismissSessionModalIfPresent();
    cy.contains('.presse__message__header__title', titre, { timeout: 90000 }).should('be.visible');

    cy.contains('.presse__message__header__title', titre)
      .last()
      .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
      .as('photoCard');

    cy.get('@photoCard')
      .find('img.presse__message__media__img', { timeout: 90000 })
      .should('be.visible')
      .and(($img) => {
        expect($img[0].naturalWidth, 'image decodée').to.be.greaterThan(0);
      });

    // Keep record published intentionally for Playwright proof screenshot.
  });
});
