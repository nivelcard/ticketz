import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      UPDATE "AiAgents"
      SET "name" = 'Webin'
      WHERE "name" = 'Atendente Inicial'
    `);
  },

  down: async (queryInterface: QueryInterface): Promise<void> => {
    await queryInterface.sequelize.query(`
      UPDATE "AiAgents"
      SET "name" = 'Atendente Inicial'
      WHERE "name" = 'Webin'
    `);
  }
};
