const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const MEDIA_HOST = process.env.MEDIA_STATIC_HOST || '127.0.0.1';
const MEDIA_PORT = parseInt(process.env.MEDIA_STATIC_PORT || '7017', 10);

const PRESSE_MEDIA_GLE_HOST = process.env.PRESSE_MEDIA_GLE_HOST || '127.0.0.1';
const PRESSE_MEDIA_GLE_PORT = parseInt(process.env.PRESSE_MEDIA_GLE_PORT || '7004', 10);

const PRESSE_MEDIA_LOC_HOST = process.env.PRESSE_MEDIA_LOC_HOST || '127.0.0.1';
const PRESSE_MEDIA_LOC_PORT = parseInt(process.env.PRESSE_MEDIA_LOC_PORT || '7008', 10);

const PRESSE_LOCALE_MSG_HOST = process.env.PRESSE_LOCALE_MSG_HOST || '127.0.0.1';
const PRESSE_LOCALE_MSG_PORT = parseInt(process.env.PRESSE_LOCALE_MSG_PORT || '7005', 10);

const PRESSE_GENERALE_MSG_HOST =
  process.env.PRESSE_GENERALE_MSG_HOST || process.env.PRESSE_GENERALE_HOST || '127.0.0.1';
const PRESSE_GENERALE_MSG_PORT = parseInt(
  process.env.PRESSE_GENERALE_MSG_PORT || process.env.PRESSE_GENERALE_PORT || '17012',
  10
);
const CONTABO_PATH_PREFIX_RAW = String(process.env.CONTABO_PATH_PREFIX || '').trim();
const CONTABO_PATH_PREFIX = CONTABO_PATH_PREFIX_RAW
  ? `/${CONTABO_PATH_PREFIX_RAW.replace(/^\/+|\/+$/g, '')}`
  : '';

const HOME_CONFIG_HOST = process.env.HOME_CONFIG_HOST || '127.0.0.1';
const HOME_CONFIG_PORT = parseInt(process.env.HOME_CONFIG_PORT || '7020', 10);

/** User-backend (auth / messages) : même origine que le front → pas de CORS (Cypress Electron inclus). */
const USER_BACKEND_HOST = process.env.USER_BACKEND_HOST || '127.0.0.1';
const USER_BACKEND_PORT = parseInt(process.env.USER_BACKEND_PORT || '7001', 10);

/** Proxy HTTP : chemin exact (query incluse si présente dans targetPath). */
function proxyRawPath(req, res, hostname, port, targetPath, proxyOpts = {}) {
  const headers = { ...req.headers, host: `${hostname}:${port}` };
  // Le navigateur envoie Origin (ex. :8082 en local Docker) ; certains backends en prod refusent CORS si ce port n’est pas listé.
  // Requête serveur-à-serveur : sans Origin, le backend accepte (cf. presseLocale app.js).
  if (proxyOpts.omitOrigin) {
    delete headers.origin;
  }
  const options = {
    hostname,
    port,
    path: targetPath,
    method: req.method,
    headers,
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.prod] proxy', hostname, port, targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

function withContaboPrefix(targetPath) {
  if (!CONTABO_PATH_PREFIX) return targetPath;
  if (!targetPath || targetPath === '/') return CONTABO_PATH_PREFIX;
  return `${CONTABO_PATH_PREFIX}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`;
}

function proxyToMedia(req, res, pathPrefix) {
  const suffix = req.url && req.url.startsWith('/') ? req.url : `/${req.url || ''}`;
  const targetPath = withContaboPrefix(pathPrefix + suffix);

  const options = {
    hostname: MEDIA_HOST,
    port: MEDIA_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${MEDIA_HOST}:${MEDIA_PORT}`,
    },
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.prod] proxy média', targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Media proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

function proxyToPresseMediaGle(req, res) {
  const pathOnly = (req.originalUrl || req.url || '').split('?')[0];
  const targetPath = withContaboPrefix(pathOnly);
  const options = {
    hostname: PRESSE_MEDIA_GLE_HOST,
    port: PRESSE_MEDIA_GLE_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${PRESSE_MEDIA_GLE_HOST}:${PRESSE_MEDIA_GLE_PORT}`,
    },
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.prod] proxy presse mediaGle', targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Presse media proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

function proxyToPresseMediaLocale(req, res) {
  const pathOnly = (req.originalUrl || req.url || '').split('?')[0];
  const targetPath = withContaboPrefix(pathOnly);
  const options = {
    hostname: PRESSE_MEDIA_LOC_HOST,
    port: PRESSE_MEDIA_LOC_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${PRESSE_MEDIA_LOC_HOST}:${PRESSE_MEDIA_LOC_PORT}`,
    },
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.prod] proxy presse mediaLocale', targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Presse locale media proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

app.use(cors());

app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/** Santé userMediaProfile (7017) via le front : /api/ping côté média n’est pas sous /api/user-media-profile. */
app.get('/api/__health/user-media-profile', (req, res) => {
  const opts = {
    hostname: MEDIA_HOST,
    port: MEDIA_PORT,
    path: '/api/ping',
    method: 'GET',
    headers: { host: `${MEDIA_HOST}:${MEDIA_PORT}` },
  };
  const p = http.request(opts, (proxRes) => {
    proxRes.on('data', () => {});
    proxRes.on('end', () => {
      const ok = proxRes.statusCode === 200;
      res.status(ok ? 200 : 502).json({ ok, upstreamStatus: proxRes.statusCode, upstream: `${MEDIA_HOST}:${MEDIA_PORT}` });
    });
  });
  p.on('error', (err) => {
    res.status(503).json({ ok: false, error: err.message, upstream: `${MEDIA_HOST}:${MEDIA_PORT}` });
  });
  p.end();
});

app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/users')) return next();
  proxyRawPath(req, res, USER_BACKEND_HOST, USER_BACKEND_PORT, o, { omitOrigin: true });
});

// JSON + upload user-media-profile : même origine que le front (évite CORS navigateur / E2E).
// Staging  (CONTABO_PATH_PREFIX=/cppeurope-staging) : réécriture → /cppeurope-staging/api/media/...
// Production (pas de préfixe)                       : réécriture → /api/media/...
// Dans les deux cas, le nginx Contabo possède une règle regex
// ^/[cppeurope-staging/]?api/media/(uploadImageProfile|mediaProfile) qui route vers
// le bon backend (port 17007 staging / port 7007 prod) sans nécessiter de route
// /api/user-media-profile/ dans la config Contabo manuellement déployée.
app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/user-media-profile')) return next();
  const targetPath = o.replace(
    /^\/api\/user-media-profile/,
    CONTABO_PATH_PREFIX ? `${CONTABO_PATH_PREFIX}/api/media` : '/api/media'
  );
  proxyRawPath(req, res, MEDIA_HOST, MEDIA_PORT, targetPath, { omitOrigin: true });
});

// Messages presse locale (7005) : /api/presse-locale/* → backend /api/*
app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/presse-locale')) return next();
  const target = withContaboPrefix(o.replace(/^\/api\/presse-locale/, '/api'));
  proxyRawPath(req, res, PRESSE_LOCALE_MSG_HOST, PRESSE_LOCALE_MSG_PORT, target, { omitOrigin: true });
});

// Messages presse générale :
// - /api/presse-generale/* (legacy/front) -> backend /api/*
// - /api/messages* (frontend historique) -> backend /api/messages*
app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (o.startsWith('/api/presse-generale')) {
    const target = withContaboPrefix(o.replace(/^\/api\/presse-generale/, '/api'));
    proxyRawPath(req, res, PRESSE_GENERALE_MSG_HOST, PRESSE_GENERALE_MSG_PORT, target, { omitOrigin: true });
    return;
  }
  if (o === '/api/messages' || o.startsWith('/api/messages/')) {
    proxyRawPath(req, res, PRESSE_GENERALE_MSG_HOST, PRESSE_GENERALE_MSG_PORT, withContaboPrefix(o), { omitOrigin: true });
    return;
  }
  next();
});

app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/home-config')) return next();
  proxyRawPath(req, res, HOME_CONFIG_HOST, HOME_CONFIG_PORT, o, { omitOrigin: true });
});

// Même routage que server.dev.js : sans cela, /api/uploads et /api/media renvoient index.html (pas les fichiers).
app.use('/mediaprofile', (req, res) => proxyToMedia(req, res, '/mediaprofile'));
app.use('/imagesprofile', (req, res) => proxyToMedia(req, res, '/imagesprofile'));
app.use('/api/media', (req, res) => proxyToPresseMediaGle(req, res));
app.use('/api/uploads', (req, res) => proxyToPresseMediaGle(req, res));
app.use('/api/media-locale', (req, res) => proxyToPresseMediaLocale(req, res));
app.use('/api/uploads-locale', (req, res) => proxyToPresseMediaLocale(req, res));

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`  → Proxy /mediaprofile + /imagesprofile → http://${MEDIA_HOST}:${MEDIA_PORT}`);
  console.log(`  → Proxy /api/media + /api/uploads → http://${PRESSE_MEDIA_GLE_HOST}:${PRESSE_MEDIA_GLE_PORT}`);
  console.log(
    `  → Proxy /api/media-locale + /api/uploads-locale → http://${PRESSE_MEDIA_LOC_HOST}:${PRESSE_MEDIA_LOC_PORT}`
  );
  console.log(`  → Proxy /api/user-media-profile → http://${MEDIA_HOST}:${MEDIA_PORT}`);
  console.log(`  → Proxy /api/presse-generale + /api/messages → http://${PRESSE_GENERALE_MSG_HOST}:${PRESSE_GENERALE_MSG_PORT}`);
  console.log(`  → Proxy /api/presse-locale → http://${PRESSE_LOCALE_MSG_HOST}:${PRESSE_LOCALE_MSG_PORT}`);
  console.log(`  → Proxy /api/home-config → http://${HOME_CONFIG_HOST}:${HOME_CONFIG_PORT}`);
  console.log(`  → Proxy /api/users → http://${USER_BACKEND_HOST}:${USER_BACKEND_PORT}`);
});
