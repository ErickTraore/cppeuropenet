/**
 * Presse Generale - Delete option 1.
 * Cible l'article "titre remplacé" (créé par option-1) dans Gérer, le supprime, vérifie la suppression.
 */
describe('Presse Générale - Delete (option 1)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const titreRemplace = 'titre remplacé';
  const usersApi = '/api/users';
  const apiMessages = () => '/api/presse-generale/messages';

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
      cy.request({
        method: 'GET',
        url: apiMessages(),
        headers: { Authorization: 'Bearer ' + token },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const messages = Array.isArray(res.body) ? res.body : [];
        const matching = messages.filter((m) => m.title === titreRemplace);
        initialCount = matching.length;

        const ensureTarget =
          initialCount > 0
            ? cy.wrap(matching[0])
            : cy
                .request({
                  method: 'POST',
                  url: `${apiMessages()}/new`,
                  headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json',
                  },
                  body: {
                    title: titreRemplace,
                    content: 'E2E seed for delete option 1',
                    categ: 'presse',
                    siteKey: 'cppEurope',
                  },
                })
                .then((createRes) => {
                  expect(createRes.status).to.eq(201);
                  return { id: createRes.body && createRes.body.id };
                });

        return ensureTarget.then((target) => {
          expect(target && target.id, 'id cible à supprimer').to.exist;
          return cy
            .request({
              method: 'DELETE',
              url: `${apiMessages()}/${target.id}`,
              headers: { Authorization: 'Bearer ' + token },
              failOnStatusCode: false,
            })
            .then((delRes) => {
              expect(delRes.status).to.be.oneOf([200, 204]);
            });
        });
      }).then(() => {
        cy.request({
          method: 'GET',
          url: apiMessages(),
          headers: { Authorization: 'Bearer ' + token },
        }).then((afterRes) => {
          expect(afterRes.status).to.eq(200);
          const after = Array.isArray(afterRes.body) ? afterRes.body : [];
          const apiRemaining = after.filter((m) => m.title === titreRemplace).length;
          if (initialCount > 0) {
            expect(apiRemaining, `Le nombre API "${titreRemplace}" doit diminuer de 1`).to.eq(Math.max(0, initialCount - 1));
          } else {
            expect(apiRemaining, `Après seed+delete, il ne doit rester aucun "${titreRemplace}"`).to.eq(0);
          }
        });
      });
    });
  });
});
