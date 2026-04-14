/**
 * Test E2E : présence des utilisateurs admin2026@cppeurope.net et user2026@cppeurope.net.
 * Connexion en admin, puis appel API GET /api/users/all/ pour vérifier que les deux comptes existent.
 */
describe('utilisateurs admin2026 et user2026', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const userEmail = 'user2026@cppeurope.net';
  const { usersApi } = require('../../support/e2eApiUrls');

  it('admin2026 et user2026 sont présents dans la liste des utilisateurs (API admin)', () => {
    cy.request({
      method: 'POST',
      url: `${usersApi}/login`,
      body: { email: adminEmail, password: adminPassword },
    }).then((loginRes) => {
      expect(loginRes.status).to.eq(200);
      const token = loginRes.body.accessToken;
      expect(token).to.be.a('string');
      cy.request({
        method: 'GET',
        url: `${usersApi}/all/`,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const users = Array.isArray(res.body) ? res.body : [];
        const emails = users.map((u) => u.email);
        expect(emails).to.include(adminEmail);
        expect(emails).to.include(userEmail);
      });
    });
  });
});
