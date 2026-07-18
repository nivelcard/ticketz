import User from "../../../models/User";
import KnowledgePermission from "../../../models/KnowledgePermission";

export type KnowledgePermissionAction = "read" | "write" | "publish" | "admin";

export type KnowledgePermissionResource = {
  companyId: number;
  resourceType: "domain" | "base" | "category" | "asset";
  resourceId?: number;
};

const PUBLISH_PROFILES = new Set(["admin", "supervisor"]);

const actionRank: Record<KnowledgePermissionAction, number> = {
  read: 1,
  write: 2,
  publish: 3,
  admin: 4
};

const permissionRank: Record<string, number> = {
  read: 1,
  write: 2,
  publish: 3,
  admin: 4
};

const profileAllowsAction = (
  profile: string,
  action: KnowledgePermissionAction
): boolean => {
  if (action === "read" || action === "write") {
    return true;
  }

  return PUBLISH_PROFILES.has(profile);
};

export const checkKnowledgePermission = async (
  action: KnowledgePermissionAction,
  resource: KnowledgePermissionResource,
  user: Pick<User, "id" | "profile" | "companyId">
): Promise<boolean> => {
  if (user.companyId !== resource.companyId) {
    return false;
  }

  if (profileAllowsAction(user.profile, action)) {
    return true;
  }

  if (!resource.resourceId) {
    return false;
  }

  const rows = await KnowledgePermission.findAll({
    where: {
      companyId: resource.companyId,
      resourceType: resource.resourceType,
      resourceId: resource.resourceId,
      principalType: "profile",
      active: true
    }
  });

  const requiredRank = actionRank[action];

  return rows.some(row => {
    const granted = permissionRank[row.permission] || 0;
    return granted >= requiredRank;
  });
};

export const assertKnowledgePermission = async (
  action: KnowledgePermissionAction,
  resource: KnowledgePermissionResource,
  user: Pick<User, "id" | "profile" | "companyId">
): Promise<void> => {
  const allowed = await checkKnowledgePermission(action, resource, user);
  if (!allowed) {
    throw new Error("ERR_KNOWLEDGE_PERMISSION_DENIED");
  }
};
