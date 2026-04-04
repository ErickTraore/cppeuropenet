'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Supprimer la colonne 'tittle' qui est un doublon avec la faute
    try {
      const [results] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM Messages LIKE 'tittle'`
      );
      if (results.length > 0) {
        console.log('Suppression de la colonne tittle (doublon avec faute de frappe)');
        await queryInterface.removeColumn('Messages', 'tittle');
      } else {
        console.log('Colonne tittle n\'existe pas, rien à supprimer');
      }
    } catch (e) {
      console.warn('Erreur ignorée dans cleanup-tittle-column:', e.message);
    }
  },

  async down (queryInterface, Sequelize) {
    // Rollback : recréer la colonne tittle (au cas où)
    try {
      const [results] = await queryInterface.sequelize.query(
        `SHOW COLUMNS FROM Messages LIKE 'tittle'`
      );
      if (results.length === 0) {
        await queryInterface.addColumn('Messages', 'tittle', {
          type: Sequelize.STRING(500),
          allowNull: true
        });
      }
    } catch (e) {
      console.warn('Erreur ignorée dans cleanup-tittle-column (down):', e.message);
    }
  }
};
