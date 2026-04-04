// test-mariadb-connection.js
const mariadb = require('mariadb');

async function testConnection() {
  let conn;
  try {
    conn = await mariadb.createConnection({
      host: 'localhost',
      port: 3313,
      user: 'c',
      password: 'CppEurope@2025!',
      database: 'user_prod_cppeurope_v1',
    });
    const rows = await conn.query('SELECT 1 as test');
    console.log('✅ Connexion MariaDB OK:', rows);
  } catch (err) {
    console.error('❌ Connexion MariaDB échouée:', err);
  } finally {
    if (conn) conn.end();
  }
}

testConnection();
