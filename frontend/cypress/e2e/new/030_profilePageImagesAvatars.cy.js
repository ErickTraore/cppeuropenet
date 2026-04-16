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
  const { userOrigin: apiBaseUrl, E2E_PROFILE } = require('../../support/e2eApiUrls');
  const registerUrl = `${apiBaseUrl}/api/users/register/`;
  const isStagingProfile = String(E2E_PROFILE || 'local').toLowerCase() === 'staging';
  /**
   * GET binaires /mediaprofile/* :
   * - local : port user-media-profile direct (moins de latence sur gros PNG)
   * - staging : même origine front (pas d'accès loopback depuis Cypress runner)
   */
  const userMediaProfileOrigin = isStagingProfile
    ? String(Cypress.config('baseUrl') || '').replace(/\/$/, '')
    : 'http://127.0.0.1:7017';

  const SLOT_TIMEOUT_MS = 90000;

  it('inscription 201 + chaîne GET/POST média + UI 4 slots + vérif API', () => {
    const userEmail = `e2e-avatars-${Date.now()}-${Math.floor(Math.random() * 1e9)}@cppeurope.net`;
    const userPassword = 'Test1234';

    const net = { postProfileMedia: 0 };

    cy.intercept('POST', '**/api/user-media-profile/mediaProfile**', (req) => {
      net.postProfileMedia += 1;
      req.continue();
    }).as('profileMediaPost');

    cy.intercept('GET', '**/api/user-media-profile/mediaProfile/**').as('profileMediaGet');

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

    cy.loginByUi(userEmail, userPassword);
    cy.dismissSessionModalIfPresent();

    // PNG défaut ~1 Mo via le proxy 8082 : transfert trop lent pour décodage fiable en E2E ; on sert une vignette minuscule.
    cy.intercept('GET', '**/mediaprofile/default/slot-*.png', { fixture: 'e2e-1x1.png' });

    cy.visit('/#profilepage');
    cy.get('.profile-page', { timeout: 10000 }).should('exist');

    let firstMediaGetLength = null;

    cy.wait('@profileMediaGet', { timeout: SLOT_TIMEOUT_MS }).then((inter) => {
      const body = inter.response?.body;
      expect(body, '1er GET média : corps présent').to.exist;
      expect(body, '1er GET média : JSON tableau').to.be.an('array');
      firstMediaGetLength = body.length;
      expect(firstMediaGetLength, '1er GET : 0 ou 4 lignes').to.be.oneOf([0, 4]);
    });

    cy.then(() => {
      if (firstMediaGetLength === 0) {
        expect(
          firstMediaGetLength,
          'chemin B : liste vide → attente du 2e GET après provisionnement'
        ).to.eq(0);
        cy.wait('@profileMediaGet', { timeout: SLOT_TIMEOUT_MS }).then((inter2) => {
          const body2 = inter2.response?.body;
          expect(body2, '2e GET média : corps présent').to.exist;
          expect(body2, '2e GET média : tableau de 4 slots').to.be.an('array').and.have.length(4);
        });
        cy.then(() => {
          expect(net.postProfileMedia, 'chemin B : exactement 4 POST création slot').to.eq(4);
        });
      } else {
        cy.then(() => {
          expect(net.postProfileMedia, 'chemin A : aucun POST si 4 slots dès le 1er GET').to.eq(0);
        });
      }
    });

    cy.get('h3').should('contain', 'Mon profil');

    cy.contains('button', 'Mes images').click();
    cy.get('.images__container').should('exist');

    cy.get('.images__container', { timeout: SLOT_TIMEOUT_MS }).within(() => {
      cy.contains('Aucune image disponible').should('not.exist');
    });

    cy.get('.images__container__grid__card', { timeout: SLOT_TIMEOUT_MS }).should('have.length', 4);
    cy.get('.images__container__grid__card img.profile-image').should('have.length', 4);

    cy.get('.images__container__grid__card img.profile-image').then(($imgs) => {
      const srcs = [...$imgs].map((el) => el.getAttribute('src') || '');
      expect(srcs, '4 vignettes avec src').to.have.length(4);
      [0, 1, 2, 3].forEach((n) => {
        const ok = srcs.some((s) => s.includes(`slot-${n}`) || s.includes(`slot-${n}.png`));
        expect(ok, `au moins une vignette doit référencer le visuel par défaut slot-${n}`).to.be.true;
      });
    });

    cy.get('.content').should(($el) => {
      expect(parseFloat(getComputedStyle($el[0]).opacity)).to.be.greaterThan(0.99);
    });

    cy.get('.images__container__grid').scrollIntoView({ block: 'center' }).should('be.visible');

    cy.get('.images__container__grid__card img.profile-image').each(($img) => {
      const src = $img.attr('src') || '';
      const u = new URL(src, Cypress.config('baseUrl'));
      const probeUrl = u.pathname.startsWith('/mediaprofile')
        ? `${userMediaProfileOrigin}${u.pathname}${u.search}`
        : u.toString();
      cy.request({ method: 'HEAD', url: probeUrl, timeout: 30000 }).its('status').should('eq', 200);
    });

    cy.get('.images__container__grid__card img.profile-image', { timeout: 20000 }).each(($img) => {
      cy.wrap($img).should(($el) => {
        const el = $el[0];
        expect(el.complete && el.naturalWidth > 0, 'vignette décodée dans le navigateur').to.be.true;
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

          rows.forEach((row) => {
            expect(row.path, `path slot ${row.slot}`).to.be.a('string');
            expect(row.path).to.include(`/mediaprofile/default/slot-${row.slot}`);
          });
        });
      });
    });

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
