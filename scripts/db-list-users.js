// Script: scripts/db-list-users.js
// Affiche la liste des utilisateurs SQL et les droits de 'c' sur la base locale

const mysql = require('mysql2/promise');

const tryPorts = [3307, 3314];

(async () => {
  let connection;
  let lastErr;
  for (const port of tryPorts) {
    try {
      connection = await mysql.createConnection({
        host: 'localhost',
        port,
        user: 'root',
        password: 'CppEurope@2025!'
      });
      console.log(`Connexion réussie à MariaDB sur le port ${port}.`);
      break;
    } catch (err) {
      lastErr = err;
      console.error(`Echec de connexion sur le port ${port}:`, err.code || err.message);
    }
  }
  if (!connection) {
    console.error('Impossible de se connecter à MariaDB sur les ports testés. Dernière erreur:', lastErr);
    process.exit(1);
  }

  try {
    // Liste des utilisateurs
    const [users] = await connection.query('SELECT User,Host FROM mysql.user;');
    console.log('Utilisateurs SQL:');
    console.table(users);

    // Droits de c@%
    const [grantsC] = await connection.query("SHOW GRANTS FOR 'c'@'%';");
    console.log("Droits de 'c'@'%':");
    console.log(grantsC.map(r => Object.values(r)[0]).join('\n'));

    // Droits de c@localhost
    const [grantsCLocal] = await connection.query("SHOW GRANTS FOR 'c'@'localhost';");
    console.log("Droits de 'c'@'localhost':");
    console.log(grantsCLocal.map(r => Object.values(r)[0]).join('\n'));

    await connection.end();
  } catch (err) {
    console.error('Erreur lors de l\'exécution des requêtes:', err);
    process.exit(1);
  }
})();
