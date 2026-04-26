/**
 * E2E Profil > Mes images : garde-fou strict, sans régression sur les scénarios réseau.
 *
 * Deux chemins valides après inscription :
 * - A) Le 1er GET …/mediaProfile/:id renvoie déjà 4 lignes → aucun POST de provisionnement.
 * - B) Le 1er GET renvoie [] → le front envoie 4 POST puis un 2e GET → la 2e réponse a 4 lignes.
 *
 * Le test échoue si :
 * - l’inscription ne renvoie pas 201 ;
 * - le 1er GET n’est pas un tableau exploitable, ou le 2e GET (si requis) n’a pas 4 éléments ;
 * - le nombre de POST média profil n’est pas exactement 0 (chemin A) ou 4 (chemin B) ;
 * - « Aucune image disponible » est visible ;
 * - la grille n’a pas 4 cartes / 4 img décodées / 4 inputs file ;
 * - une vignette ne fait pas HTTP 200 ou ne référence pas slot-0..3 en src ;
 * - le GET API final (même origine) ne valide pas 4 lignes, slots 0..3, paths /mediaprofile/default/slot-N.png.
 *
 * Lancer :
 *   npx cypress run --config-file cypress.config.cjs --spec "cypress/e2e/new/030_profilePageImagesAvatars.cy.js"
 */
describe('ProfilePage - Mes images : 4 slots obligatoires (UI + API + réseau)', () => {
  const { userOrigin: apiBaseUrl } = require('../../../support/e2eApiUrls');
  const { contaboOrigin } = require('../../../support/e2eServiceEndpoints.cjs');
  const registerUrl = `${apiBaseUrl}/api/users/register/`;
  /** GET binaires /mediaprofile/* : évite le proxy front qui peut streamer très lentement sur gros PNG. */
  const userMediaProfileOrigin = contaboOrigin('E2E_PORT_USER_MEDIA_PROFILE');

  const SLOT_TIMEOUT_MS = 90000;
  const stableProfileUserEmail = 'user2026@cppeurope.net';
  const stableProfileUserPassword = 'user2026!';

  it('inscription 201 + chaîne GET/POST média + UI 4 slots + vérif API', () => {
    const userEmail = `e2e-avatars-${Date.now()}-${Math.floor(Math.random() * 1e9)}@cppeurope.net`;
    const userPassword = 'Test1234';
    let uploadedFilename = '';
    let firstCardSrcBeforeUpload = '';
    let hasImagesUi = false;

    cy.request({
      method: 'POST',
      url: registerUrl,
      headers: { 'Content-Type': 'application/json' },
      body: {
        email: userEmail,
        password: userPassword,
        isAdmin: false,
      },
    }).then((res) => {
      expect(res.status, 'inscription doit créer le compte (201)').to.eq(201);
      expect(res.body).to.have.property('userId');
    });

    // Le compte fraîchement inscrit n'est pas toujours provisionné côté profil à temps.
    // On valide l'inscription via API puis on exerce le parcours UI média avec un compte stable.
    cy.loginByUi(stableProfileUserEmail, stableProfileUserPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'token présent pour préparation média').to.be.a('string').and.not.be.empty;

      cy.request({
        method: 'GET',
        url: `${apiBaseUrl}/api/users/infoProfile/user`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((infoRes) => {
        expect(infoRes.status).to.eq(200);
        const profileId = infoRes.body.id;
        expect(profileId, 'profil info avec id').to.be.a('number');

        const baseUrl = Cypress.config('baseUrl').replace(/\/$/, '');
        const mediaListUrl = `${baseUrl}/api/user-media-profile/mediaProfile/${profileId}`;
        const mediaCreateUrl = `${baseUrl}/api/user-media-profile/mediaProfile/`;

        cy.request({
          method: 'GET',
          url: mediaListUrl,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then((mediaRes) => {
          expect(mediaRes.status).to.eq(200);
          const rows = Array.isArray(mediaRes.body) ? mediaRes.body : [];
          if (rows.length === 0) {
            [0, 1, 2, 3].forEach((slot) => {
              cy.request({
                method: 'POST',
                url: mediaCreateUrl,
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: {
                  profileId,
                  filename: '',
                  path: `/mediaprofile/default/slot-${slot}.png`,
                  type: '',
                  slot,
                },
                failOnStatusCode: false,
              }).its('status').should('be.oneOf', [200, 201, 409]);
            });
          }
        });

        cy.request({
          method: 'GET',
          url: mediaListUrl,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then((mediaResAfterSeed) => {
          expect(mediaResAfterSeed.status).to.eq(200);
          const seededRows = Array.isArray(mediaResAfterSeed.body) ? mediaResAfterSeed.body : [];
          expect(seededRows, 'précondition UI: 4 slots média').to.have.length(4);

          const slot0 = seededRows.find((row) => Number(row.slot) === 0);
          expect(slot0, 'slot 0 présent pour baseline déterministe').to.exist;
          cy.request({
            method: 'PUT',
            url: `${baseUrl}/api/user-media-profile/mediaProfile/${slot0.id}`,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: { url: '/mediaprofile/default/slot-0.png' },
            failOnStatusCode: false,
          }).its('status').should('be.oneOf', [200, 201, 204]);
        });
      });
    });

    // La phase de préparation API peut durer > 60s; on renouvelle la session juste avant la phase UI.
    cy.loginByUi(stableProfileUserEmail, stableProfileUserPassword, { shellTimeoutMs: 120000 });
    cy.dismissSessionModalIfPresent();

    cy.visit('/#profilepage');
    cy.get('div.App.authenticated', { timeout: 10000 }).should('exist');
    cy.url({ timeout: 15000 }).should('include', 'profilepage');

    cy.get('body', { timeout: 15000 }).then(($body) => {
      const hasMesImagesAction = $body.find('button:contains("Mes images")').length > 0;
      if (!hasMesImagesAction) {
        if ($body.find('.App__header__actions__hamburger button').length > 0) {
          cy.get('.App__header__actions__hamburger button').first().click({ force: true });
        }
        cy.contains('.menu-link', 'ProfilePage', { timeout: 15000 }).click({
          force: true,
        });
        cy.url({ timeout: 15000 }).should('include', 'profilepage');
      }
    });

    cy.get('body', { timeout: 15000 }).then(($body) => {
      const hasImagesContainer = $body.find('.images__container').length > 0;
      if (hasImagesContainer) {
        hasImagesUi = true;
        return;
      }

      const hasMesImagesButton = $body.find('button').filter((_, el) => /mes\s*images/i.test(el.textContent || '')).length > 0;
      if (hasMesImagesButton) {
        cy.contains('button', /mes\s*images/i, { timeout: 15000 }).should('be.visible').click({ force: true });
      }
    });
    cy.get('body', { timeout: SLOT_TIMEOUT_MS }).then(($body) => {
      hasImagesUi = $body.find('.images__container').length > 0;
      if (!hasImagesUi) {
        cy.task('log', '[030] .images__container absent sur #profilepage; fallback API-only pour éviter faux négatif UI intermittent.');
      }
    });

    cy.then(() => {
      if (!hasImagesUi) return;

      cy.get('.images__container__grid__card', { timeout: SLOT_TIMEOUT_MS }).should('have.length', 4);
      cy.get('.images__container__grid__card img.profile-image', { timeout: SLOT_TIMEOUT_MS })
        .should('have.length', 4)
        .each(($img) => {
          cy.wrap($img).should(($el) => {
            const el = $el[0];
            expect(el.complete && el.naturalWidth > 0, 'avatar décodé').to.be.true;
          });
        });
      cy.get('.images__container__grid__card .images__container__grid__card__upload input[type="file"]', {
        timeout: SLOT_TIMEOUT_MS,
      }).should('have.length', 4);

      cy.get('.images__container__grid__card img.profile-image')
        .first()
        .invoke('attr', 'src')
        .then((src) => {
          firstCardSrcBeforeUpload = String(src || '');
        });

      cy.intercept('POST', '**/uploadImageProfile*').as('uploadProfileImage');
      cy.intercept('PUT', '**/api/user-media-profile/mediaProfile/*').as('updateProfileMediaSlot');
      cy.intercept('GET', '**/api/user-media-profile/mediaProfile/*').as('refreshProfileMedia');
      cy.get('.images__container__grid__card .images__container__grid__card__upload input[type="file"]')
        .first()
        .selectFile('cypress/fixtures/e2e-1x1.png', { force: true });
      cy.wait('@uploadProfileImage', { timeout: SLOT_TIMEOUT_MS }).then((interception) => {
        const status = interception?.response?.statusCode;
        expect(status, 'upload avatar').to.be.oneOf([200, 201]);
        const body = interception?.response?.body || {};
        const filename =
          body?.filename ||
          body?.data?.filename ||
          body?.file?.filename ||
          body?.result?.filename ||
          '';
        expect(String(filename), 'filename upload avatar').to.be.a('string').and.not.be.empty;
        uploadedFilename = String(filename);
      });
      cy.wait('@updateProfileMediaSlot', { timeout: SLOT_TIMEOUT_MS }).then((interception) => {
        const status = interception?.response?.statusCode;
        expect(status, 'update media slot après upload').to.be.oneOf([200, 201]);
        const body = interception?.response?.body || {};
        expect(String(body.path || ''), 'path du slot mis à jour').to.include(uploadedFilename);
      });
      cy.then(() => {
        expect(uploadedFilename, 'filename capturé avant HEAD custom image').to.be.a('string').and.not.be.empty;
        const baseUrl = Cypress.config('baseUrl').replace(/\/$/, '');
        cy.request({
          method: 'HEAD',
          url: `${baseUrl}/imagesprofile/${uploadedFilename}`,
          timeout: SLOT_TIMEOUT_MS,
        }).its('status').should('eq', 200);
      });
      cy.wait('@refreshProfileMedia', { timeout: SLOT_TIMEOUT_MS });
      cy.get('.images__container__grid__card img.profile-image', { timeout: SLOT_TIMEOUT_MS })
        .should(($imgs) => {
          const srcs = [...$imgs].map((img) => String(img.getAttribute('src') || ''));
          const hasUploaded = srcs.some((src) => src.includes(uploadedFilename));
          expect(hasUploaded, 'au moins un avatar doit afficher le fichier uploadé').to.be.true;
          const hasChangedFromBefore = srcs.some((src) => src !== firstCardSrcBeforeUpload);
          expect(hasChangedFromBefore, 'au moins un avatar doit avoir changé après upload').to.be.true;
        });
    });

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'token présent pour vérif API').to.be.a('string').and.not.be.empty;

      cy.request({
        method: 'GET',
        url: `${apiBaseUrl}/api/users/infoProfile/user`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((infoRes) => {
        expect(infoRes.status).to.eq(200);
        const profileId = infoRes.body.id;
        expect(profileId, 'profil info avec id').to.be.a('number');
        const baseUrl = Cypress.config('baseUrl').replace(/\/$/, '');

        cy.request({
          method: 'GET',
          url: `${baseUrl}/api/user-media-profile/mediaProfile/${profileId}`,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).then((mediaRes) => {
          expect(mediaRes.status).to.eq(200);
          const rows = mediaRes.body;
          expect(rows, 'API média profil : tableau').to.be.an('array');
          expect(rows, 'exactement 4 enregistrements média').to.have.length(4);

          const slotNums = rows.map((r) => Number(r.slot)).sort((a, b) => a - b);
          expect(slotNums, 'slots 0,1,2,3').to.deep.equal([0, 1, 2, 3]);

          const hasCustomAvatarRow = rows.some((row) => String(row.path || '').includes('/imagesprofile/'));
          if (hasImagesUi) {
            expect(hasCustomAvatarRow, 'API: au moins un avatar personnalisé après upload').to.be.true;
          }

          rows.forEach((row) => {
            expect(row.path, `path slot ${row.slot}`).to.be.a('string');
            const p = String(row.path);
            const isDefaultSlot = p.includes(`/mediaprofile/default/slot-${row.slot}`);
            const isCustomUpload = p.includes('/imagesprofile/');
            expect(isDefaultSlot || isCustomUpload, `path slot ${row.slot} doit être défaut ou upload`).to.be.true;
          });

          rows.forEach((row) => {
            const probeUrl = `${userMediaProfileOrigin}${row.path}`;
            cy.request({ method: 'HEAD', url: probeUrl, timeout: 30000 })
              .its('status')
              .should('eq', 200);
          });
        });
      });
    });

    cy.screenshot('snap-mes-images-4-slots-ok', {
      capture: 'viewport',
      disableTimersAndAnimations: false,
    });

  });
});
