import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  createKnowledgeDomain,
  listKnowledgeDomains,
  updateKnowledgeDomain
} from "../services/AiServices/KnowledgeCms/KnowledgeDomainService";
import { safeAiQuery } from "../helpers/safeAiQuery";
import {
  assertKnowledgePermission,
  checkKnowledgePermission
} from "../services/AiServices/KnowledgeCms/KnowledgePermissionService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id, profile } = req.user;
  const allowed = await checkKnowledgePermission(
    "read",
    { companyId, resourceType: "domain" },
    { id: Number(id), profile, companyId }
  );
  if (!allowed) {
    throw new AppError("ERR_KNOWLEDGE_PERMISSION_DENIED", 403);
  }

  const domains = await safeAiQuery(() => listKnowledgeDomains(companyId), []);
  return res.json(domains);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id, profile } = req.user;
  await assertKnowledgePermission(
    "admin",
    { companyId, resourceType: "domain" },
    { id: Number(id), profile, companyId }
  );

  const domain = await createKnowledgeDomain({
    companyId,
    ...req.body
  });
  return res.status(201).json(domain);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id, profile } = req.user;
  const { id: domainId } = req.params;

  await assertKnowledgePermission(
    "admin",
    { companyId, resourceType: "domain", resourceId: Number(domainId) },
    { id: Number(id), profile, companyId }
  );

  const domain = await updateKnowledgeDomain({
    companyId,
    domainId: Number(domainId),
    ...req.body
  });
  return res.json(domain);
};
