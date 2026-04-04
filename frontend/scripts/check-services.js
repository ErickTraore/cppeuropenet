// scripts/check-services.js
// Vérifie l'état de chaque service listé dans services-inventory.json
// Affiche un rapport d'accessibilité HTTP pour chaque service

const fs = require('fs');
const http = require('http');

const inventoryPath = './services-inventory.json';

function checkService(service) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: service.port,
      path: '/',
      method: 'GET',
      timeout: 2000,
    };
    const req = http.request(options, (res) => {
      resolve({
        name: service.name,
        port: service.port,
        status: res.statusCode,
        ok: [200, 304, 401, 400].includes(res.statusCode),
      });
    });
    req.on('error', () => {
      resolve({
        name: service.name,
        port: service.port,
        status: 'NO RESPONSE',
        ok: false,
      });
    });
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(inventoryPath)) {
    console.error('services-inventory.json introuvable');
    process.exit(1);
  }
  const services = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
  const results = await Promise.all(services.map(checkService));
  let allOk = true;
  results.forEach((r) => {
    console.log(`${r.name} (port ${r.port}): ${r.ok ? 'OK' : 'INACCESSIBLE'} (status: ${r.status})`);
    if (!r.ok) allOk = false;
  });
  process.exit(allOk ? 0 : 2);
}

main();
