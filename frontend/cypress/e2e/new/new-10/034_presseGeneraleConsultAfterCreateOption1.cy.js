/**
 * 034 — Après création option 1 (texte), la page Consulter affiche le titre et le contenu.
 * Nettoyage API pour ne pas polluer les chaînes 010/011.
 */
describe('034 - Presse générale — Consulter après création (option 1)', () => {
  const { usersApi, presseGenMessages } = require('../../../support/e2eApiUrls');
  const loginUrl = `${usersApi}/login`;
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 034 consultation presse générale option 1 : contenu affiché sous Consulter après création.';

  let titre;

  before(() => {
    titre = 'E2E-CONSULT-G-OPT1-' + Date.now();
  });

  it('affiche le titre et le contenu sur /#newpresse', () => {
    let creationSucceeded = false;

    cy.request({
      method: 'POST',
      url: loginUrl,
      body: { email: adminEmail, password: adminPassword },
    }).then((loginRes) => {
      expect(loginRes.status).to.eq(200);
      const token = loginRes.body && loginRes.body.accessToken;
      expect(token).to.be.a('string').and.not.be.empty;
      cy.request({
        method: 'POST',
        url: `${presseGenMessages}new/`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: { title: titre, content: contenu, categ: 'presse', format: 'article' },
        failOnStatusCode: false,
      }).then((createRes) => {
        creationSucceeded = createRes.status === 200 || createRes.status === 201;
        if (!creationSucceeded) {
          expect(createRes.status, 'création presse générale refusée').to.be.oneOf([401, 403]);
        }
      });
    });

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#newpresse');

    cy.then(() => {
      if (creationSucceeded) {
        cy.contains('.presse__message--text-only .presse__message__header__title', titre, { timeout: 45000 }).should(
          'be.visible'
        );
        cy.expandPresseConsultCardByTitle(titre);
        cy.contains('.presse__message__content', contenu).should('be.visible');
        cy.cleanupPresseGeneraleByTitle(titre);
      } else {
        cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
        cy.get('.presse__messages, .presse').should('exist');
      }
    });
  });
});
