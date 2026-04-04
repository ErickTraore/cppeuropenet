// Cypress E2E support
require('./commands');

// Prevent Cypress from failing tests on uncaught exceptions in the app
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log the error to help debugging unexpected app crashes
  // eslint-disable-next-line no-console
  console.error('Cypress caught uncaught exception:', err);
  return false;
});

// Capture any runtime errors that happen in the browser window
Cypress.on('window:before:load', (win) => {
  const origOnError = win.onerror;
  win.onerror = function (message, source, lineno, colno, error) {
    // eslint-disable-next-line no-console
    console.error('window.onerror', { message, source, lineno, colno, error });
    if (origOnError) {
      origOnError(message, source, lineno, colno, error);
    }
  };

  // Forward browser console logs to the Cypress runner output (useful for debugging)
  const origConsoleLog = win.console.log;
  win.console.log = (...args) => {
    // eslint-disable-next-line no-console
    console.log('[BROWSER]', ...args);
    origConsoleLog.apply(win.console, args);
  };
  const origConsoleError = win.console.error;
  win.console.error = (...args) => {
    // eslint-disable-next-line no-console
    console.error('[BROWSER][ERROR]', ...args);
    origConsoleError.apply(win.console, args);
  };
});
