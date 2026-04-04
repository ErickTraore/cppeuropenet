/**
 * Dev (npm start) : aligné sur server.dev.js — même origine vers backends locaux (CORS évité).
 * Sans ces routes, /api/user-media-profile et /mediaprofile retombent sur index.html → profil cassé.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const targetGle = process.env.PRESSE_MEDIA_GLE_PROXY || 'http://127.0.0.1:7004';
  const targetLoc = process.env.PRESSE_MEDIA_LOC_PROXY || 'http://127.0.0.1:7008';
  const targetProfile = process.env.MEDIA_STATIC_PROXY || 'http://127.0.0.1:7017';
  const targetPresseLocaleApi = process.env.PRESSE_LOCALE_MSG_PROXY || 'http://127.0.0.1:7005';

  app.use(
    '/api/user-media-profile',
    createProxyMiddleware({
      target: targetProfile,
      changeOrigin: true,
      onProxyReq: (proxyReq) => {
        proxyReq.removeHeader('origin');
      },
    })
  );
  app.use(
    '/api/presse-locale',
    createProxyMiddleware({
      target: targetPresseLocaleApi,
      changeOrigin: true,
      pathRewrite: { '^/api/presse-locale': '/api' },
      onProxyReq: (proxyReq) => {
        proxyReq.removeHeader('origin');
      },
    })
  );
  app.use('/mediaprofile', createProxyMiddleware({ target: targetProfile, changeOrigin: true }));
  app.use('/imagesprofile', createProxyMiddleware({ target: targetProfile, changeOrigin: true }));

  app.use('/api/media', createProxyMiddleware({ target: targetGle, changeOrigin: true }));
  app.use('/api/uploads', createProxyMiddleware({ target: targetGle, changeOrigin: true }));
  app.use('/api/media-locale', createProxyMiddleware({ target: targetLoc, changeOrigin: true }));
  app.use('/api/uploads-locale', createProxyMiddleware({ target: targetLoc, changeOrigin: true }));
};
