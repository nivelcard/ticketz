import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  createKnowledgeCategory,
  deleteKnowledgeCategory,
  listCategoriesByBase,
  updateKnowledgeCategory
} from "../services/AiServices/KnowledgeCms/KnowledgeCategoryService";
import {
  assertKnowledgePermission,
  checkKnowledgePermission
} from "../services/AiServices/KnowledgeCms/KnowledgePermissionService";

export const indexByBase = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id, profile } = req.user;
  const { baseId } = req.params;

  const allowed = await checkKnowledgePermission(
    "read",
    { companyId, resourceType: "base", resourceId: Number(baseId) },
    { id: Number(id), profile, companyId }
  );
  if (!allowed) {
    throw new AppError("ERR_KNOWLEDGE_PERMISSION_DENIED", 403);
  }

  const categories = await listCategoriesByBase(companyId, Number(baseId));
  return res.json(categories);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id, profile } = req.user;

  await assertKnowledgePermission(
    "write",
    {
      companyId,
      resourceType: "base",
      resourceId: Number(req.body.knowledgeBaseId)
    },
    { id: Number(id), profile, companyId }
  );

  const category = await createKnowledgeCategory({
    companyId,
    ...req.body
  });
  return res.status(201).json(category);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id, profile } = req.user;
  const { id: categoryId } = req.params;

  await assertKnowledgePermission(
    "write",
    {
      companyId,
      resourceType: "category",
      resourceId: Number(categoryId)
    },
    { id: Number(id), profile, companyId }
  );

  const category = await updateKnowledgeCategory({
    companyId,
    categoryId: Number(categoryId),
    ...req.body
  });
  return res.json(category);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id, profile } = req.user;
  const { id: categoryId } = req.params;

  await assertKnowledgePermission(
    "admin",
    {
      companyId,
      resourceType: "category",
      resourceId: Number(categoryId)
    },
    { id: Number(id), profile, companyId }
  );

  await deleteKnowledgeCategory(companyId, Number(categoryId));
  return res.status(200).json({ message: "Category deleted" });
};
