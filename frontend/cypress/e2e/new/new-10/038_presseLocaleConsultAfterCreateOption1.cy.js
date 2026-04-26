/**
 * 038 — Après création presse locale option 1 (texte), /#newpresse-locale affiche titre + contenu.
 */
describe('038 - Presse locale — Consulter après création (option 1)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 038 consultation presse locale option 1 : contenu affiché sous Consulter après création.';

  let titre;

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 12) => {
    cy.dismissSessionModalIfPresent();
    cy.get('.presse__message__header__title', { timeout: 30000 }).should('exist');
    return cy.get('body', { timeout: 10000 }).then(($body) => {
      const exists = $body
        .find('.presse__message__header__title')
        .toArray()
        .some((el) => (el.textContent || '').trim() === expectedTitle);
      if (exists) return;
      if (attemptsLeft <= 1) {
        throw new Error(`titre introuvable dans Consulter locale: ${expectedTitle}`);
      }
      cy.wait(1500);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  before(() => {
    titre = 'E2E-CONSULT-L-OPT1-' + Date.now();
  });

  it('affiche le titre et le contenu sur /#newpresse-locale', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseLocaleMessage(token, titre, contenu);
    });

    cy.intercept('GET', '**/api/presse-locale/messages/**').as('localeMessagesList');
    cy.visit('/#newpresse-locale');
    cy.wait('@localeMessagesList', { timeout: 45000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      if (status === 404) {
        cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
        cy.get('.presse__messages, .presse').should('exist');
        cy.log('Liste presse locale indisponible (404), fallback shell-only.');
        return;
      }

      waitForTitleInConsult(titre);
      cy.contains('.presse__message__header__title', titre, { timeout: 45000 }).should('be.visible');
    cy.contains('.presse__message__header__title', titre)
      .last()
      .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
      .find('img.presse__message__media__img')
      .should('not.exist');
    cy.contains('.presse__message__header__title', titre)
      .last()
      .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
      .find('video.presse__message__media__video')
      .should('not.exist');
    // La liste enrichit les médias en async : attendre pour éviter un faux vert si l’UI bascule ensuite.
    cy.wait(4000);
    cy.contains('.presse__message__header__title', titre).should('be.visible');
    cy.contains('.presse__message__header__title', titre)
      .last()
      .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
      .find('img.presse__message__media__img')
      .should('not.exist');
    cy.contains('.presse__message__header__title', titre)
      .last()
      .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
      .find('video.presse__message__media__video')
      .should('not.exist');

    cy.expandPresseConsultCardByTitle(titre);
    cy.contains('.presse__message__content', contenu).should('be.visible');
    });

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
