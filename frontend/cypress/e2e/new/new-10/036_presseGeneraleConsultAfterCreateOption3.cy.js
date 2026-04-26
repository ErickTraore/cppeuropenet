/**
 * 036 — Consulter après « création » article + vidéo (presse générale).
 * Upload vidéo via API multipart (Node) : le formulaire UI échoue souvent si REACT_APP_MEDIA_API
 * ne pointe pas vers un hôte joignable depuis le navigateur ; la page Consulter reste testée en réel.
 *
 * Garde-fous : getMedia 200 + entrée vidéo, cy.request GET sur l’URL mp4 (octets 200, taille > 0) :
 * les chargements <video> ne passent pas par fetch/XHR donc cy.intercept ne les voit pas.
 * Puis <source> cohérent, lecture (muted + play + currentTime). readyState/duration ignorés en Electron headless.
 */
describe('036 - Presse générale — Consulter après création (option 3 vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 036 consultation presse générale option 3 : texte avec article vidéo sous Consulter.';

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
        throw new Error(`titre introuvable dans Consulter: ${expectedTitle}`);
      }
      cy.wait(1500);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  before(() => {
    titre = 'E2E-CONSULT-G-OPT3-' + Date.now();
  });

  it('affiche la vidéo, getMedia + fichier mp4 OK, src valide et lecture (currentTime) sur /#newpresse', () => {
    // 1. Connexion admin (login UI)
    cy.loginByUi(adminEmail, adminPassword);
    // 2. Création de l'article via l'API
    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'token présent après login').to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseGeneraleMessage(token, titre, contenu, 'article-video').then((id) => {
        expect(id, 'id message créé').to.be.a('number').and.to.be.greaterThan(0);
        // 3. Upload de la vidéo via l'API
        return cy.apiUploadPresseGeneraleVideo(token, id, 'article-video').then((uploadRes) => {
          // 4. Consultation dans l'UI
          cy.visit('/#newpresse');
          waitForTitleInConsult(titre);
          cy.contains('.presse__message__header__title', titre, { timeout: 90000 }).should('be.visible');
          cy.contains('.presse__message__header__title', titre)
            .last()
            .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
            .as('videoCard');

          cy.get('@videoCard').find('video.presse__message__media__video', { timeout: 30000 }).should('be.visible').should(($v) => {
            expect($v[0].currentSrc, 'src vidéo').to.match(/\.mp4$/);
          });

          cy.expandPresseConsultCardByTitle(titre, { timeout: 90000 });
          cy.contains('.presse__message__content', contenu).should('be.visible');

          cy.get('@videoCard').scrollIntoView().should('be.visible').screenshot('newpresse-video-card-visible-036');

          // 5. Suppression (cleanup) à la toute fin
          cy.cleanupPresseGeneraleByTitle(titre);
        });
      });
    });
  });
});
