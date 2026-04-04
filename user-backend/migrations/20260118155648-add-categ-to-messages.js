'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Ajouter la colonne categ
    await queryInterface.addColumn('Messages', 'categ', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'presse'
    });

    // Remplir tous les enregistrements existants avec 'presse'
    await queryInterface.sequelize.query(
      "UPDATE Messages SET categ = 'presse' WHERE categ IS NULL"
    );
  },

  async down (queryInterface, Sequelize) {
    // Supprimer la colonne categ si elle existe
    try {
      await queryInterface.removeColumn('Messages', 'categ');
    } catch (e) {
      console.warn('Colonne categ déjà supprimée ou inexistante, on ignore:', e.message);
    }
  }
};
