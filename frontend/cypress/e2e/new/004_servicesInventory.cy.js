// cypress/e2e/00d_servicesInventory.cy.js

describe('00D - Présence du fichier d\'inventaire des services', () => {
  it('Le fichier services-inventory.json doit exister', () => {
    cy.readFile('services-inventory.json').should('exist');
  });
});
