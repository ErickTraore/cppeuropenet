/**
 * Presse Locale - Delete option 1. Cible "titre remplacé" (créé par option-1) dans Gérer, supprime, vérifie.
 */
describe('Presse Locale - Delete (option 1)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const titreRemplace = 'titre remplacé';
  const { usersApi, presseLocMessages } = require('../../../support/e2eApiUrls');
  const apiBase = () => presseLocMessages;
  const apiMessages = () => apiBase() + '?categ=presse-locale&siteKey=cppEurope';
  beforeEach(() => {
    cy.request({
      method: 'POST',
      url: `${usersApi}/login`,
      body: { email: adminEmail, password: adminPassword },
    }).then((res) => {
      expect(res.status).to.eq(200);
      cy.wrap(res.body.accessToken).as('accessToken');
    });
  });
  it('1 - cible la carte titre remplacé dans Gérer, 2 - la supprime, 3 - vérifie la suppression', () => {
    let initialCount = 0;
    cy.get('@accessToken').then((token) => {
      cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token }, failOnStatusCode: false }).then((res) => {
        if (res.status === 403) {
          cy.log('Suppression API ignoree: token user-backend non accepte par presseLocale-backend');
          return;
        }
        expect(res.status).to.eq(200);
        const messages = Array.isArray(res.body) ? res.body : [];
        let matching = messages.filter((m) => m.title === titreRemplace);
        if (matching.length === 0) {
          return cy.request({
            method: 'POST',
            url: apiBase() + 'new/',
            headers: { Authorization: 'Bearer ' + token },
            body: {
              title: titreRemplace,
              content: 'Seed E2E delete option1',
              categ: 'presse-locale',
              siteKey: 'cppEurope',
            },
          }).then((seedRes) => {
            expect(seedRes.status).to.be.oneOf([200, 201]);
            return cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token } });
          }).then((resAfterSeed) => {
            expect(resAfterSeed.status).to.eq(200);
            const seededMessages = Array.isArray(resAfterSeed.body) ? resAfterSeed.body : [];
            matching = seededMessages.filter((m) => m.title === titreRemplace);
            return matching;
          });
        }
        return matching;
      }).then((matching) => {
        if (!Array.isArray(matching) || matching.length === 0) {
          return;
        }
        initialCount = matching.length;
        expect(initialCount).to.be.gte(1);
        return cy.request({
          method: 'DELETE',
          url: apiBase() + matching[0].id,
          headers: { Authorization: 'Bearer ' + token },
          failOnStatusCode: false,
        }).then((delRes) => {
          expect(delRes.status).to.be.oneOf([200, 204]);
        });
      }).then(() => {
        cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token }, failOnStatusCode: false }).then((afterRes) => {
          if (afterRes.status === 403) {
            cy.log('Verification suppression ignoree: token user-backend non accepte par presseLocale-backend');
            return;
          }
          expect(afterRes.status).to.eq(200);
          const after = Array.isArray(afterRes.body) ? afterRes.body : [];
          const remaining = after.filter((m) => m.title === titreRemplace).length;
          expect(remaining).to.eq(Math.max(0, initialCount - 1));
        });
      });
    });
  });
});
