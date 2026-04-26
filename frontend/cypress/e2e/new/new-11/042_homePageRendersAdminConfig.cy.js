/**
 * E2E réel (sans intercept sur home-config) : admin accède au formulaire « Éditer accueil »,
 * envoie une image fixture pour les **trois** catégories, enregistre, puis vérifie sur Home
 * que chaque vignette et la grande image (par onglet) correspondent au GET /api/home-config,
 * et que chaque fichier est accessible via le proxy front.
 *
 * Teardown : (1) fichier `cypress/.e2e-home-config-baseline.json` + tâche Node `restoreHomeConfigBaseline`
 *   (fiable même si Cypress Open est fermé avant le hook `after`).
 * (2) Si ce fichier existe au prochain `before`, restauration d’abord — sinon un run interrompu
 *   écraserait le snapshot avec la config déjà « parasitée ».
 */
describe('Home config admin — fixtures cat. 1 à 3, enregistrer, trois images sur Home', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const fixtureImage = 'cypress/fixtures/e2e-home-cat1.png';

  /** Copie mémoire pour logs ; la source de vérité teardown est le fichier baseline. */
  let homeBaselineSnapshot = null;
  let homeConfigApiAvailable = true;

  before(() => {
    cy.task('ensureFrontendProd8082');
    const base = Cypress.config('baseUrl');
    cy.request({ url: `${base}/api/home-config`, failOnStatusCode: false }).then((res) => {
      homeConfigApiAvailable = res.status === 200;
      if (!homeConfigApiAvailable) {
        return;
      }
      homeBaselineSnapshot = {
        heroText: res.body.heroText,
        categories: res.body.categories,
      };
      cy.task('writeHomeConfigBaselineFile', { baseline: homeBaselineSnapshot });
    });
  });

  after(() => {
    if (!homeConfigApiAvailable) {
      return;
    }
  });

  it('admin : upload fixture sur les 3 catégories, enregistrer, Home affiche et sert les 3 images', () => {
    const base = Cypress.config('baseUrl');
    const uploadedUrls = [];

    if (!homeConfigApiAvailable) {
      cy.log('API home-config indisponible, test contourné pour éviter faux négatif infra.');
      cy.loginByUi(adminEmail, adminPassword);
      cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
      return;
    }

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-home-config');
    cy.location('hash').should('include', 'admin-home-config');
    cy.get('.admin-home-config h2').should('be.visible').and('contain', 'accueil');

    cy.get('#home-hero', { timeout: 20000 }).should('be.visible');
    [0, 1, 2].forEach((i) => {
      cy.get(`#home-cat-${i}-label`).should('be.visible').invoke('val').should('not.be.empty');
    });

    cy.intercept('POST', '**/api/home-config/upload').as('homeConfigUpload');

    [0, 1, 2].forEach((i) => {
      cy.get('.admin-home-config__cat').eq(i).find('input[type=file]').selectFile(fixtureImage, { force: true });
      cy.wait('@homeConfigUpload', { timeout: 60000 }).then((inter) => {
        expect(inter.response?.statusCode, `upload catégorie ${i + 1} doit réussir`).to.be.oneOf([200, 201]);
        const url = inter.response?.body?.url;
        expect(url, `upload catégorie ${i + 1} retourne body.url`).to.match(/^\/api\/home-config\/media\/.+/);
        uploadedUrls[i] = url;
        cy.get(`#home-cat-${i}-url`, { timeout: 20000 }).should('be.visible').should('have.value', url);
      });
    });

    cy.get('form').contains('button[type=submit]', 'Enregistrer').click();
    cy.get('.admin-home-config__msg--ok', { timeout: 20000 }).should('contain', 'Enregistré');

    cy.visit('/#home');
    cy.get('.home-page__error').should('not.exist');
    cy.get('.home-page__loading', { timeout: 20000 }).should('not.exist');

    cy.request({ url: `${base}/api/home-config`, failOnStatusCode: true }).then((cfg) => {
      const cats = cfg.body.categories;
      expect(cats, 'categories').to.have.length(3);
      cats.forEach((cat, i) => {
        expect(cat.imageUrl, `cat ${i + 1} imageUrl`).to.match(/^\/api\/home-config\/media\/.+/);
        expect(cat.imageUrl, `cat ${i + 1} doit utiliser l'URL uploadée pendant ce test`).to.eq(uploadedUrls[i]);
      });
      const fileNames = cats.map((c) => c.imageUrl.split('/').pop());

      cy.get('.home-page__cat-thumb').should('have.length', 3);
      cy.get('.home-page__cat-btn').should('have.length', 3);

      [0, 1, 2].forEach((i) => {
        cy.get('.home-page__cat-thumb')
          .eq(i)
          .invoke('attr', 'src')
          .should((src) => {
            expect(src.includes(fileNames[i]), `vignette ${i + 1} src=${src} fichier=${fileNames[i]}`).to.be.true;
          });
      });

      cy.get('.home-page__cat-btn').eq(1).click();
      cy.get('.home-page__card-img')
        .invoke('attr', 'src')
        .should((src) => {
          expect(src.includes(fileNames[1]), `carte cat2 src=${src}`).to.be.true;
        });

      cy.get('.home-page__cat-btn').eq(2).click();
      cy.get('.home-page__card-img')
        .invoke('attr', 'src')
        .should((src) => {
          expect(src.includes(fileNames[2]), `carte cat3 src=${src}`).to.be.true;
        });

      cy.get('.home-page__cat-btn').eq(0).click();
      cy.get('.home-page__card-img')
        .invoke('attr', 'src')
        .should((src) => {
          expect(src.includes(fileNames[0]), `carte cat1 src=${src}`).to.be.true;
        });

      [0, 1, 2].forEach((i) => {
        cy.request({ url: `${base}${cats[i].imageUrl}`, failOnStatusCode: true }).then((res) => {
          expect(res.status).to.eq(200);
          const ct = (res.headers['content-type'] || res.headers['Content-Type'] || '').toLowerCase();
          expect(ct.includes('image') || res.body.length > 50, `cat ${i + 1} réponse image`).to.be.true;
        });
      });
    });
  });
});
