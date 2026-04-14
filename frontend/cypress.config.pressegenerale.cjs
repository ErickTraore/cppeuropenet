process.env.NODE_OPTIONS = "";
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:7006',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/new/010_presseGeneraleCreateOption1.cy.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    browserConsoleLogOptions: {
      logLevels: ['error', 'warn'],
      terminal: true,
    },
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
      });
      return config;
    },
  },
});
