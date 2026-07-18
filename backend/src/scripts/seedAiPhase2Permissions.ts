/**
 * Seed default knowledge permissions for admin/supervisor profiles
 * Run: cd backend && npx ts-node --transpile-only src/scripts/seedAiPhase2Permissions.ts
 */
import "../bootstrap";
import sequelize from "../database";
import Company from "../models/Company";
import KnowledgePermission from "../models/KnowledgePermission";

const PROFILES = ["admin", "supervisor"];

const seedCompanyPermissions = async (companyId: number): Promise<number> => {
  let created = 0;

  await Promise.all(
    PROFILES.map(async () => {
      const [, wasCreated] = await KnowledgePermission.findOrCreate({
        where: {
          companyId,
          resourceType: "asset",
          resourceId: 0,
          principalType: "profile",
          principalId: 0,
          permission: "publish"
        },
        defaults: {
          companyId,
          resourceType: "asset",
          resourceId: 0,
          principalType: "profile",
          principalId: 0,
          permission: "publish",
          active: true
        }
      });

      if (wasCreated) {
        created += 1;
      }

      await KnowledgePermission.findOrCreate({
        where: {
          companyId,
          resourceType: "domain",
          resourceId: 0,
          principalType: "profile",
          principalId: 0,
          permission: "admin"
        },
        defaults: {
          companyId,
          resourceType: "domain",
          resourceId: 0,
          principalType: "profile",
          principalId: 0,
          permission: "admin",
          active: true
        }
      });
    })
  );

  return created;
};

(async () => {
  await sequelize.authenticate();

  const companyFilter = process.env.COMPANY_ID
    ? { id: Number(process.env.COMPANY_ID) }
    : {};

  const companies = await Company.findAll({ where: companyFilter });
  let total = 0;

  await Promise.all(
    companies.map(async company => {
      total += await seedCompanyPermissions(company.id);
    })
  );

  console.log(
    `Seeded permissions for ${companies.length} companies (${total} new rows)`
  );
  process.exit(0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
