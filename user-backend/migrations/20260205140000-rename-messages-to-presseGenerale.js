'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hasTable = async (name) => {
      const tables = await queryInterface.showAllTables();
      return tables.includes(name);
    };

    if (await hasTable('Messages')) {
      await queryInterface.renameTable('Messages', 'PresseGle');
    } else if (await hasTable('PresseGenerales')) {
      await queryInterface.renameTable('PresseGenerales', 'PresseGle');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const hasTable = async (name) => {
      const tables = await queryInterface.showAllTables();
      return tables.includes(name);
    };

    if (await hasTable('PresseGle')) {
      await queryInterface.renameTable('PresseGle', 'Messages');
    }
  }
};
