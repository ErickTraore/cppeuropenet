describe('099 - Preuve manuelle newpresse avec media visible', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const titre = `MANUAL-PROOF-PHOTO-${Date.now()}`;
  const contenu = 'Preuve manuelle: media visible sur newpresse.';

  it('publie un article photo puis vérifie son affichage public', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.intercept('POST', /\/(api\/presse-generale\/messages|api\/messages)\/new/).as('presseNew');
    cy.intercept('POST', '**/api/media/uploadImage/**').as('apiUploadImage');

    cy.visit('/#admin-presse-generale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('#format', { timeout: 20000 }).select('article-photo');
    cy.get('input[name="title"]').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.get('input[type="file"][name="image"]').selectFile('cypress/fixtures/e2e-1x1.png', { force: true });
    cy.contains('button', '📸 Publier').click();

    cy.wait('@presseNew', { timeout: 120000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      const body = interception && interception.response ? interception.response.body : null;
      expect(status, 'POST /api/messages/new').to.be.oneOf([200, 201]);
      const createdId = body && body.id ? body.id : null;
      expect(createdId, 'id message créé').to.be.a('number');
      cy.wrap(createdId).as('createdMessageId');
    });

    cy.wait('@apiUploadImage', { timeout: 60000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      expect(status, 'POST /api/media/uploadImage → mediaGle local').to.be.oneOf([200, 201]);
    });

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();
    cy.visit('/#newpresse');
    cy.dismissSessionModalIfPresent();
    cy.contains('.presse__message__header__title', titre, { timeout: 90000 }).should('be.visible');

    cy.get('body', { timeout: 90000 }).should(($body) => {
      const $title = $body
        .find('.presse__message__header__title')
        .filter((_, el) => (el.textContent || '').trim() === titre);
      expect($title.length, 'titre visible dans newpresse').to.be.greaterThan(0);

      const $card = $title
        .last()
        .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video');
      expect($card.length, 'carte contenant le titre').to.be.greaterThan(0);

      const $img = $card.find('img.presse__message__media__img:visible');
      expect($img.length, 'image visible dans la carte').to.be.greaterThan(0);
      expect($img[0].naturalWidth, 'image decodée').to.be.greaterThan(0);
    });

    // Keep record published intentionally for Playwright proof screenshot.
  });
});
