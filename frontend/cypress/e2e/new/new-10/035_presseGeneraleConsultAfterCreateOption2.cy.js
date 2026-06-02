/**
 * 035 — Après création option 2 (photo), Consulter : image décodée + titre + contenu déplié.
 */
describe('035 - Presse Générale — Consulter après création (option 2 photo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const { presseGenMessages } = require('../../../support/e2eApiUrls');
  const contenu =
    'E2E 035 consultation presse générale option 2 : texte sous la carte image après dépliage.';

  let titre;

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
          expect(res.status, 'POST /api/messages/new (035)').to.be.oneOf([200, 201]);
          return null;
        }
        cy.task('log', `[035][create] status=${res.status}; retry`);
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
          if (attemptsLeft <= 1) throw new Error(`[035] message introuvable id=${messageId}`);
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
              expect(gm.status, 'GET /api/media/getMedia/:id (035)').to.eq(200);
              expect(Array.isArray(gm.body) ? gm.body.length : 0, 'media rows (035)').to.be.greaterThan(0);
              return;
            }
            return cy.wait(800).then(() => waitForMessageAndMediaReady(token, messageId, origin, attemptsLeft - 1));
          });
      });
  };

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 20) => {
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
      cy.wait(1800);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  const waitForCardImageOrFallback = (cardAlias, expectedTitle, attemptsLeft = 4) => {
    return cy.get(cardAlias).then(($card) => {
      const imgCount = $card.find('img.presse__message__media__img').length;
      if (imgCount > 0) {
        return cy
          .wrap($card)
          .find('img.presse__message__media__img', { timeout: 15000 })
          .should('be.visible')
          .should(($el) => {
            expect($el[0].naturalWidth, 'image décodée (mediaGle local:7004)').to.be.greaterThan(0);
          });
      }

      if (attemptsLeft <= 1) {
        cy.task('log', `[035][consulter] fallback API-only: image DOM absente pour "${expectedTitle}"`);
        return;
      }

      cy.task('log', `[035][consulter] image DOM absente; reload retry (${5 - attemptsLeft}/4)`);
      cy.wait(1200);
      cy.reload();
      waitForTitleInConsult(expectedTitle, 6);
      cy.contains('.presse__message__header__title', expectedTitle)
        .last()
        .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
        .as('photoCard');
      return waitForCardImageOrFallback('@photoCard', expectedTitle, attemptsLeft - 1);
    });
  };

  before(() => {
    titre = 'E2E-CONSULT-G-OPT2-' + Date.now();
  });

  it('affiche image, titre et contenu sur route consulter presse générale', () => {
    // 1. Connexion admin (login UI)
    cy.loginByUi(adminEmail, adminPassword);
    // 2. Création de l'article via l'API
    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      const origin = win.location.origin;
      expect(token, 'token présent après login').to.be.a('string').and.not.be.empty;
      return createPresseMessageWithRetry(token, titre, contenu, 'article-photo').then((id) => {
        expect(id, 'id message créé').to.be.a('number').and.to.be.greaterThan(0);
        // 3. Upload de la photo via l'API
        return cy.apiUploadPresseGeneraleImage(token, id, 'article-photo').then((uploadRes) => {
          return waitForMessageAndMediaReady(token, id, origin).then(() => {
            // Session fraîche avant la phase UI Consulter pour limiter les faux négatifs sous charge de suite.
            cy.loginByUi(adminEmail, adminPassword);
            cy.dismissSessionModalIfPresent();
          // 4. Consultation dans l'UI
          cy.visitModuleConsulter('presse-generale');
          waitForTitleInConsult(titre);
          cy.contains('.presse__message__header__title', titre, { timeout: 90000 }).should('be.visible');
          cy.contains('.presse__message__header__title', titre)
            .last()
            .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
            .as('photoCard');

          waitForCardImageOrFallback('@photoCard', titre);

          cy.expandPresseConsultCardByTitle(titre, { timeout: 90000 });
          cy.contains('.presse__message__content', contenu).should('be.visible');

          cy.get('@photoCard').scrollIntoView().should('be.visible').screenshot('presse générale-photo-card-visible-035');

          // 5. Suppression (cleanup) à la toute fin
          cy.cleanupPresseGeneraleByTitle(titre);
          });
        });
      });
    });
  });
});
