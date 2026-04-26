'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('Media') && !tables.includes('MediaPresseGle')) {
      await queryInterface.renameTable('Media', 'MediaPresseGle');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();

    if (tables.includes('MediaPresseGle') && !tables.includes('Media')) {
      await queryInterface.renameTable('MediaPresseGle', 'Media');
    }
  }
};
