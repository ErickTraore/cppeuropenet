/**
 * Presse Locale - Delete option 4. Cible "titre remplacé Option4" dans Gérer, supprime, vérifie.
 */
describe('Presse Locale - Delete (option 4)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const usersApi = 'http://localhost:7001/api/users';
  const titreRemplace = 'titre remplacé Option4';
  const apiBase = () => 'http://localhost:7005/api/messages/';
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
  it('1 - cible la carte titre remplacé Option4 dans Gérer, 2 - la supprime, 3 - vérifie la suppression', () => {
    let initialCount = 0;
    cy.get('@accessToken').then((token) => {
      cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token } }).then((res) => {
        expect(res.status).to.eq(200);
        const messages = Array.isArray(res.body) ? res.body : [];
        const matching = messages.filter((m) => m.title === titreRemplace);
        initialCount = matching.length;
        expect(initialCount, `Au moins un message API "${titreRemplace}" doit exister avant suppression`).to.be.gte(1);

        return cy.request({
          method: 'DELETE',
          url: apiBase() + matching[0].id,
          headers: { Authorization: 'Bearer ' + token },
          failOnStatusCode: false,
        }).then((delRes) => {
          expect(delRes.status).to.be.oneOf([200, 204]);
        });
      }).then(() => {
        cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token } }).then((afterRes) => {
          expect(afterRes.status).to.eq(200);
          const after = Array.isArray(afterRes.body) ? afterRes.body : [];
          const remaining = after.filter((m) => m.title === titreRemplace).length;
          expect(remaining, `Le nombre de messages API "${titreRemplace}" doit diminuer de 1`).to.eq(Math.max(0, initialCount - 1));
        });
      });
    });
  });
});
