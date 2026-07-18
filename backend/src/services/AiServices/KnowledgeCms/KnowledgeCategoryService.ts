import { Op } from "sequelize";
import KnowledgeCategory from "../../../models/KnowledgeCategory";
import KnowledgeBase from "../../../models/KnowledgeBase";
import AppError from "../../../errors/AppError";
import { validateKnowledgeMetadata } from "./KnowledgeMetadataSchema";
import { slugify } from "./slugify";

const MAX_CATEGORY_DEPTH = 8;

const buildPathIds = async (
  companyId: number,
  knowledgeBaseId: number,
  parentCategoryId?: number | null
): Promise<{ pathIds: number[]; depth: number }> => {
  if (!parentCategoryId) {
    return { pathIds: [], depth: 0 };
  }

  const parent = await KnowledgeCategory.findOne({
    where: { id: parentCategoryId, companyId, knowledgeBaseId }
  });

  if (!parent) {
    throw new AppError("Parent category not found", 404);
  }

  const pathIds = [...(parent.pathIds || []), parent.id];
  return { pathIds, depth: pathIds.length };
};

const recalcSubtreePathIds = async (
  category: KnowledgeCategory
): Promise<void> => {
  const children = await KnowledgeCategory.findAll({
    where: {
      companyId: category.companyId,
      knowledgeBaseId: category.knowledgeBaseId,
      parentCategoryId: category.id
    }
  });

  await Promise.all(
    children.map(async child => {
      const pathIds = [...(category.pathIds || []), category.id];
      await child.update({ pathIds, depth: pathIds.length });
      await recalcSubtreePathIds(child);
    })
  );
};

export const listCategoriesByBase = async (
  companyId: number,
  knowledgeBaseId: number
): Promise<KnowledgeCategory[]> => {
  const base = await KnowledgeBase.findOne({
    where: { id: knowledgeBaseId, companyId }
  });

  if (!base) {
    throw new AppError("Knowledge base not found", 404);
  }

  return KnowledgeCategory.findAll({
    where: { companyId, knowledgeBaseId },
    order: [
      ["depth", "ASC"],
      ["sortOrder", "ASC"],
      ["name", "ASC"]
    ]
  });
};

export type CreateCategoryInput = {
  companyId: number;
  knowledgeBaseId: number;
  parentCategoryId?: number | null;
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
};

export const createKnowledgeCategory = async (
  input: CreateCategoryInput
): Promise<KnowledgeCategory> => {
  const base = await KnowledgeBase.findOne({
    where: { id: input.knowledgeBaseId, companyId: input.companyId }
  });

  if (!base) {
    throw new AppError("Knowledge base not found", 404);
  }

  const { pathIds, depth } = await buildPathIds(
    input.companyId,
    input.knowledgeBaseId,
    input.parentCategoryId
  );

  if (depth >= MAX_CATEGORY_DEPTH) {
    throw new AppError("Category depth limit exceeded", 400);
  }

  const slug = slugify(input.slug || input.name);
  const existing = await KnowledgeCategory.findOne({
    where: {
      companyId: input.companyId,
      knowledgeBaseId: input.knowledgeBaseId,
      parentCategoryId: input.parentCategoryId || null,
      slug
    }
  });

  if (existing) {
    throw new AppError("Category slug already exists at this level", 409);
  }

  return KnowledgeCategory.create({
    companyId: input.companyId,
    knowledgeBaseId: input.knowledgeBaseId,
    parentCategoryId: input.parentCategoryId || null,
    slug,
    name: input.name,
    description: input.description || "",
    sortOrder: input.sortOrder ?? 100,
    depth,
    pathIds,
    active: input.active !== false,
    metadata: validateKnowledgeMetadata(input.metadata)
  });
};

export type UpdateCategoryInput = {
  companyId: number;
  categoryId: number;
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
  parentCategoryId?: number | null;
};

export const updateKnowledgeCategory = async (
  input: UpdateCategoryInput
): Promise<KnowledgeCategory> => {
  const category = await KnowledgeCategory.findOne({
    where: { id: input.categoryId, companyId: input.companyId }
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (input.parentCategoryId !== undefined) {
    await moveKnowledgeCategory({
      companyId: input.companyId,
      categoryId: category.id,
      newParentCategoryId: input.parentCategoryId
    });
    await category.reload();
  }

  const nextSlug = input.slug ? slugify(input.slug) : undefined;
  if (nextSlug && nextSlug !== category.slug) {
    const conflict = await KnowledgeCategory.findOne({
      where: {
        companyId: input.companyId,
        knowledgeBaseId: category.knowledgeBaseId,
        parentCategoryId: category.parentCategoryId,
        slug: nextSlug,
        id: { [Op.ne]: category.id }
      }
    });
    if (conflict) {
      throw new AppError("Category slug already exists at this level", 409);
    }
  }

  await category.update({
    ...(input.name != null ? { name: input.name } : {}),
    ...(nextSlug ? { slug: nextSlug } : {}),
    ...(input.description != null ? { description: input.description } : {}),
    ...(input.sortOrder != null ? { sortOrder: input.sortOrder } : {}),
    ...(input.active != null ? { active: input.active } : {}),
    ...(input.metadata != null
      ? { metadata: validateKnowledgeMetadata(input.metadata) }
      : {})
  });

  return category;
};

export const moveKnowledgeCategory = async (input: {
  companyId: number;
  categoryId: number;
  newParentCategoryId: number | null;
}): Promise<KnowledgeCategory> => {
  const category = await KnowledgeCategory.findOne({
    where: { id: input.categoryId, companyId: input.companyId }
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (input.newParentCategoryId === category.id) {
    throw new AppError("Category cannot be its own parent", 400);
  }

  if (input.newParentCategoryId) {
    const parent = await KnowledgeCategory.findOne({
      where: {
        id: input.newParentCategoryId,
        companyId: input.companyId,
        knowledgeBaseId: category.knowledgeBaseId
      }
    });

    if (!parent) {
      throw new AppError("Parent category not found", 404);
    }

    const parentPath = [...(parent.pathIds || []), parent.id];
    if (parentPath.includes(category.id)) {
      throw new AppError("Cannot move category into its own subtree", 400);
    }

    if (parentPath.length >= MAX_CATEGORY_DEPTH) {
      throw new AppError("Category depth limit exceeded", 400);
    }
  }

  const { pathIds, depth } = await buildPathIds(
    input.companyId,
    category.knowledgeBaseId,
    input.newParentCategoryId
  );

  await category.update({
    parentCategoryId: input.newParentCategoryId,
    pathIds,
    depth
  });

  await recalcSubtreePathIds(category);
  return category;
};

export const deleteKnowledgeCategory = async (
  companyId: number,
  categoryId: number
): Promise<void> => {
  const category = await KnowledgeCategory.findOne({
    where: { id: categoryId, companyId }
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const childCount = await KnowledgeCategory.count({
    where: { companyId, parentCategoryId: categoryId }
  });

  if (childCount > 0) {
    throw new AppError("Category has child categories", 409);
  }

  await category.destroy();
};
