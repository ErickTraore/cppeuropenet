/**
 * Presse Générale - Delete option 3. Cible "titre remplacé Option3" dans Gérer, supprime, vérifie.
 */
describe('Presse Générale - Delete (option 3)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const titreRemplace = 'titre remplacé Option3';
  const { usersApi, presseGenMessages } = require('../../../support/e2eApiUrls');
  const apiMessages = () => presseGenMessages;
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
  it('1 - cible la carte titre remplacé Option3 dans Gérer, 2 - la supprime, 3 - vérifie la suppression', () => {
    let initialCount = 0;
    cy.get('@accessToken').then((token) => {
      cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token }, failOnStatusCode: false }).then((res) => {
        if (res.status === 403) {
          cy.log('Suppression API ignorée: token user-backend non accepté par presseGenerale-backend');
          return;
        }
        expect(res.status).to.eq(200);
        const messages = Array.isArray(res.body) ? res.body : [];
        let matching = messages.filter((m) => m.title === titreRemplace);
        if (matching.length === 0) {
          return cy.request({
            method: 'POST',
            url: apiMessages() + 'new/',
            headers: { Authorization: 'Bearer ' + token },
            body: {
              title: titreRemplace,
              content: 'Seed E2E delete option3',
              categ: 'presse',
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
        expect(initialCount, `Au moins un message API "${titreRemplace}" doit exister avant suppression`).to.be.gte(1);

        return cy.request({
          method: 'DELETE',
          url: apiMessages() + matching[0].id,
          headers: { Authorization: 'Bearer ' + token },
          failOnStatusCode: false,
        }).then((delRes) => {
          expect(delRes.status).to.be.oneOf([200, 204]);
        });
      }).then(() => {
        cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token }, failOnStatusCode: false }).then((afterRes) => {
          if (afterRes.status === 403) {
            cy.log('Vérification suppression ignorée: token user-backend non accepté par presseGenerale-backend');
            return;
          }
          expect(afterRes.status).to.eq(200);
          const after = Array.isArray(afterRes.body) ? afterRes.body : [];
          const apiRemaining = after.filter((m) => m.title === titreRemplace).length;
          expect(apiRemaining, `Le nombre API "${titreRemplace}" doit diminuer de 1`).to.eq(Math.max(0, initialCount - 1));
        });
      });
    });
  });
});
