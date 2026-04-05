/**
 * E2E réel (sans intercept sur home-config) : admin accède au formulaire « Éditer accueil »,
 * envoie une image fixture pour la catégorie 1 uniquement, enregistre, puis vérifie sur Home
 * que l’URL d’image servie est bien affichée et que le fichier est accessible via le proxy front.
 *
 * Teardown : (1) fichier `cypress/.e2e-home-config-baseline.json` + tâche Node `restoreHomeConfigBaseline`
 *   (fiable même si Cypress Open est fermé avant le hook `after`).
 * (2) Si ce fichier existe au prochain `before`, restauration d’abord — sinon un run interrompu
 *   écraserait le snapshot avec la config déjà « parasitée ».
 */
describe('Home config admin — fixture cat.1, enregistrer, image visible sur Home', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const fixtureCat1 = 'cypress/fixtures/e2e-home-cat1.png';

  /** Copie mémoire pour logs ; la source de vérité teardown est le fichier baseline. */
  let homeBaselineSnapshot = null;

  before(() => {
    cy.task('ensureFrontendProd8082');
    const base = Cypress.config('baseUrl');
    // Run précédent interrompu : le fichier contient encore le bon état, la BDD non.
    cy.task('restoreHomeConfigBaseline', {
      baseUrl: base,
      adminEmail,
      adminPassword,
    });
    cy.request({ url: `${base}/api/home-config`, failOnStatusCode: true }).then((res) => {
      homeBaselineSnapshot = {
        heroText: res.body.heroText,
        categories: res.body.categories,
      };
      cy.task('writeHomeConfigBaselineFile', { baseline: homeBaselineSnapshot });
    });
  });

  after(() => {
    const base = Cypress.config('baseUrl');
    cy.task('restoreHomeConfigBaseline', {
      baseUrl: base,
      adminEmail,
      adminPassword,
    });
  });

  it('admin admis sur le formulaire, upload fixture cat.1, enregistrer, Home affiche et sert l’image', () => {
    const base = Cypress.config('baseUrl');

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-home-config');
    cy.location('hash').should('include', 'admin-home-config');
    cy.get('.admin-home-config h2').should('be.visible').and('contain', 'accueil');

    cy.get('#home-hero', { timeout: 20000 }).should('be.visible');
    cy.get('#home-cat-0-label').should('be.visible').invoke('val').should('not.be.empty');

    cy.get('.admin-home-config__cat').eq(0).find('input[type=file]').selectFile(fixtureCat1, { force: true });

    cy.get('#home-cat-0-url', { timeout: 20000 })
      .should('be.visible')
      .invoke('val')
      .should('match', /^\/api\/home-config\/media\/.+/);

    cy.get('form').contains('button[type=submit]', 'Enregistrer').click();
    cy.get('.admin-home-config__msg--ok', { timeout: 20000 }).should('contain', 'Enregistré');

    cy.visit('/#home');
    cy.get('.home-page__error').should('not.exist');
    cy.get('.home-page__loading', { timeout: 20000 }).should('not.exist');

    // Source de vérité : même GET que le composant Home (évite décalage champ formulaire vs DOM).
    cy.request({ url: `${base}/api/home-config`, failOnStatusCode: true }).then((cfg) => {
      const cat0 = cfg.body.categories[0];
      expect(cat0.imageUrl, 'cat.1 imageUrl').to.match(/^\/api\/home-config\/media\/.+/);
      const fileName = cat0.imageUrl.split('/').pop();

      cy.get('.home-page__cat-thumb')
        .first()
        .invoke('attr', 'src')
        .should((src) => {
          expect(src.includes(fileName), `vignette src=${src} fichier=${fileName}`).to.be.true;
        });

      cy.get('.home-page__card .home-page__card-img')
        .invoke('attr', 'src')
        .should((src) => {
          expect(src.includes(fileName), `carte src=${src} fichier=${fileName}`).to.be.true;
        });

      cy.request({ url: `${base}${cat0.imageUrl}`, failOnStatusCode: true }).then((res) => {
        expect(res.status).to.eq(200);
        const ct = (res.headers['content-type'] || res.headers['Content-Type'] || '').toLowerCase();
        expect(ct.includes('image') || res.body.length > 50, 'réponse image').to.be.true;
      });
    });
  });
});
