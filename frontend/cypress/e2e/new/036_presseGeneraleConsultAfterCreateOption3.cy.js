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

  before(() => {
    titre = 'E2E-CONSULT-G-OPT3-' + Date.now();
  });

  it('affiche la vidéo, getMedia + fichier mp4 OK, src valide et lecture (currentTime) sur /#newpresse', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseGeneraleMessage(token, titre, contenu).then((id) => {
        cy.wrap(id).as('presseMessageId');
        return cy.apiUploadPresseGeneraleVideo(token, id);
      });
    });

    cy.get('@presseMessageId').then((id) => {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('accessToken');
        const origin = win.location.origin;
        cy.request({
          url: `${origin}/api/media/getMedia/${id}`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((gm) => {
          expect(gm.status, 'getMedia via même origine (proxy → mediaGle)').to.eq(200);
          expect(gm.body, 'corps getMedia').to.be.an('array').and.not.be.empty;
          const videoEntry = gm.body.find((m) => (m.type || '').toLowerCase().includes('video'));
          expect(videoEntry, 'entrée type video dans getMedia').to.exist;
          const pathOrUrl = videoEntry.path || videoEntry.url;
          expect(pathOrUrl, 'chemin fichier vidéo').to.be.a('string').and.match(/\/api\/uploads\/videos\//);
          const videoAbsUrl = pathOrUrl.startsWith('http')
            ? pathOrUrl
            : `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
          cy.request({ url: videoAbsUrl, encoding: 'binary', failOnStatusCode: false }).then((vr) => {
            if (vr.status === 401 || vr.status === 403) {
              return cy
                .request({
                  url: videoAbsUrl,
                  encoding: 'binary',
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then((vr2) => {
                  expect(vr2.status, 'GET octets mp4 (avec Bearer si protégé)').to.eq(200);
                  expect(vr2.body.length, 'fichier mp4 non trivial').to.be.greaterThan(2048);
                });
            }
            expect(vr.status, 'GET octets mp4 (même URL que le <video>)').to.eq(200);
            expect(vr.body.length, 'fichier mp4 non trivial').to.be.greaterThan(2048);
          });
        });
      });
    });

    cy.visit('/#newpresse');

    cy.contains('.presse__message--video-only .presse__message__header__title', titre, { timeout: 120000 }).should(
      'be.visible'
    );

    cy.contains('.presse__message--video-only .presse__message__header__title', titre)
      .closest('.presse__message--video-only')
      .as('presseCard');

    cy.get('@presseCard')
      .find('video.presse__message__media__video', { timeout: 120000 })
      .should('be.visible');

    cy.get('@presseCard')
      .find('video.presse__message__media__video')
      .should(($video) => {
        const v = $video[0];
        expect(v.error, 'élément <video> sans MediaError (avant lecture)').to.be.null;
        const sourceEl = v.querySelector('source');
        expect(sourceEl, 'balise <source> présente').to.exist;
        const raw = sourceEl.getAttribute('src') || '';
        const schemeCount = (raw.match(/https?:\/\//g) || []).length;
        expect(schemeCount, 'au plus un http(s) dans src (sinon BASE_URL+URL absolue → lecture bloquée)').to.be.at.most(
          1
        );
        const src = sourceEl.src || raw;
        expect(src, 'URL dans <source> (fichier mp4 presse)').to.match(/\/api\/uploads\/videos\/.+\.mp4/i);
      });

    cy.get('@presseCard').find('.presse__message__media__videoWrapper__overlay').should('be.visible').click();

    cy.get('@presseCard')
      .find('video.presse__message__media__video', { timeout: 15000 })
      .should(($v) => {
        expect($v[0].hasAttribute('controls'), 'mode vidéo actif (évite race toggleVideo + mouseLeave)').to.be.true;
      });

    cy.get('@presseCard')
      .find('video.presse__message__media__video')
      .then(($video) => {
        const el = $video[0];
        el.muted = true;
        const p = el.paused ? el.play() : Promise.resolve();
        return p.catch((e) => {
          throw new Error(`play() refusé : ${e && e.message}`);
        });
      });

    cy.get('@presseCard')
      .find('video.presse__message__media__video', { timeout: 45000 })
      .should(($video) => {
        const v = $video[0];
        expect(v.paused, 'vidéo en lecture').to.be.false;
        expect(v.error, 'pas d erreur Media pendant/après lecture').to.be.null;
      });

    cy.get('@presseCard')
      .find('video.presse__message__media__video', { timeout: 45000 })
      .should(($video) => {
        expect($video[0].currentTime, 'curseur temps > 0 (lecture réelle)').to.be.greaterThan(0.05);
      });

    cy.expandPresseConsultCardByTitle(titre, { timeout: 120000 });
    cy.contains('.presse__message--video-only .presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseGeneraleByTitle(titre);
  });
});
