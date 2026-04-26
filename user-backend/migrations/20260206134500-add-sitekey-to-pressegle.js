'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('PresseGle')) {
      return;
    }

    const columns = await queryInterface.describeTable('PresseGle');
    if (columns.siteKey) {
      return;
    }

    await queryInterface.addColumn('PresseGle', 'siteKey', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('PresseGle')) {
      return;
    }

    const columns = await queryInterface.describeTable('PresseGle');
    if (!columns.siteKey) {
      return;
    }

    await queryInterface.removeColumn('PresseGle', 'siteKey');
  }
};
