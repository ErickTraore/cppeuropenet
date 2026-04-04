/**
 * Test E2E : les 4 slots créés à l'inscription doivent apparaître dans Profil > Mes images.
 * Règle métier : à la création utilisateur, le backend provisionne exactement 4 emplacements ;
 * l'utilisateur peut ensuite y téléverser ses images.
 *
 * Lancer :
 *   npm run cypress:run -- --spec "cypress/e2e/030_profilePageImagesAvatars.cy.js"
 *
 * Le serveur e2e sert `build/` : exécuter `CI= npm run build` dans `frontend` après changement d’API média.
 */
describe('ProfilePage - Mes images : 4 slots obligatoires après inscription', () => {
  const apiBaseUrl = 'http://localhost:7001';
  const registerUrl = `${apiBaseUrl}/api/users/register/`;

  it('inscription API + connexion UI + exactement 4 cartes Mes images', () => {
    const userEmail = `e2e-avatars-${Date.now()}@cppeurope.net`;
    const userPassword = 'Test1234';

    cy.request({
      method: 'POST',
      url: registerUrl,
      headers: { 'Content-Type': 'application/json' },
      body: {
        email: userEmail,
        password: userPassword,
        isAdmin: false,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 201, 409]).to.include(res.status);
      if (res.status !== 409) {
        expect(res.body).to.have.property('userId');
      }
    });

    cy.loginByUi(userEmail, userPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#profilepage');
    cy.get('.profile-page', { timeout: 10000 }).should('exist');
    cy.get('h3').should('contain', 'Mon profil');

    cy.contains('button', 'Mes images').click();
    cy.get('.images__container').should('exist');

    cy.get('.images__container__grid__card', { timeout: 30000 }).should('have.length', 4);
    cy.get('.images__container__grid__card img.profile-image').should('have.length', 4);

    // PageContent.css : .content { opacity:0 → fadeIn 0.6s } — avant la fin, la capture peut être vide alors que le DOM est déjà là.
    cy.get('.content').should(($el) => {
      expect(parseFloat(getComputedStyle($el[0]).opacity)).to.be.greaterThan(0.99);
    });

    cy.get('.images__container__grid').scrollIntoView({ block: 'center' }).should('be.visible');

    // 1) Chaque src doit répondre HTTP 200 (même origine : server.dev.js proxifie /mediaprofile et /imagesprofile).
    cy.get('.images__container__grid__card img.profile-image').each(($img) => {
      const src = $img.attr('src');
      const url = src.startsWith('http') ? src : `${Cypress.config('baseUrl')}${src}`;
      cy.request({ url, encoding: 'binary' }).its('status').should('eq', 200);
    });

    // 2) Preuve pixel : vignettes réellement décodées dans le navigateur (pas seulement des balises vides).
    cy.get('.images__container__grid__card img.profile-image', { timeout: 20000 }).each(($img) => {
      cy.wrap($img).should(($el) => {
        const el = $el[0];
        expect(el.complete && el.naturalWidth > 0, 'vignette décodée').to.be.true;
      });
    });
    // Par défaut Cypress coupe timers/animations au moment du screenshot — risque de figer le fade-in à opacity:0.
    cy.screenshot('snap-mes-images-4-slots-ok', {
      capture: 'viewport',
      disableTimersAndAnimations: false,
    });

    cy.get('.images__container__grid__card').each(($card) => {
      cy.wrap($card)
        .find('.images__container__grid__card__upload input[type="file"]')
        .should('exist');
    });
  });
});
