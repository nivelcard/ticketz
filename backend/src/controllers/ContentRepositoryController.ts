import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Queue from "../models/Queue";
import User from "../models/User";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import {
  archiveRepositoryCategory,
  archiveRepositoryItem,
  assertRepositoryAccess,
  attachFavoriteFlags,
  buildRepositoryAccessForTicket,
  canAccessRepositoryItem,
  compareItemVersions,
  createRepositoryCategory,
  createRepositoryItem,
  createRepositoryItemFromUpload,
  getRepositoryItem,
  getRepositoryKnowledgeStatus,
  listFavoriteRepositoryItems,
  listItemVersions,
  listPopularRepositoryItems,
  listRecentRepositoryItemsForUser,
  listRepositoryCategories,
  listRepositoryForTicket,
  listRepositoryItems,
  reprocessRepositoryKnowledge,
  resolveRepositoryMime,
  restoreItemVersion,
  toggleRepositoryFavorite,
  unlinkRepositoryKnowledge,
  updateRepositoryCategory,
  updateRepositoryItem
} from "../services/ContentRepository/ContentRepositoryService";
import sendRepositoryItemToTicket from "../services/ContentRepository/SendContentRepositoryItemService";
import { ContentRepositoryType } from "../models/ContentRepositoryItem";
import StorageService from "../services/StorageService/StorageService";

const currentUserId = (req: Request): number | undefined => {
  const parsed = Number(req.user.id);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBool = (value: unknown, fallback = false): boolean => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
};

const loadUser = async (req: Request): Promise<User> => {
  const user = await User.findByPk(req.user.id, {
    include: [{ model: Queue, as: "queues" }]
  });
  if (!user) {
    throw new AppError("ERR_NO_USER", 404);
  }
  return user;
};

const buildAccess = (user: User, forAi = false) => ({
  userId: user.id,
  profile: user.profile,
  companyId: user.companyId,
  queueIds: user.queues?.map(q => q.id) || [],
  forAi
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);

  const items = await listRepositoryItems(
    {
      companyId: user.companyId,
      search: req.query.search ? String(req.query.search) : undefined,
      contentType: req.query.contentType
        ? String(req.query.contentType)
        : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      categoryId: req.query.categoryId
        ? Number(req.query.categoryId)
        : undefined,
      tag: req.query.tag ? String(req.query.tag) : undefined,
      knowledgeDomainId: req.query.knowledgeDomainId
        ? Number(req.query.knowledgeDomainId)
        : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
      sortBy: (req.query.sortBy as "recent" | "popular" | "name") || "recent"
    },
    buildAccess(user)
  );

  return res.json(await attachFavoriteFlags(items, user.companyId, user.id));
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const item = await getRepositoryItem(user.companyId, Number(req.params.itemId));
  const [enriched] = await attachFavoriteFlags([item], user.companyId, user.id);
  return res.json(enriched);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("write", user, user.companyId);

  const item = await createRepositoryItem({
    companyId: user.companyId,
    authorUserId: currentUserId(req),
    name: String(req.body.name),
    displayTitle: req.body.displayTitle
      ? String(req.body.displayTitle)
      : undefined,
    contentType: String(
      req.body.contentType || "text"
    ) as ContentRepositoryType,
    category: req.body.category ? String(req.body.category) : undefined,
    categoryId: req.body.categoryId ? Number(req.body.categoryId) : undefined,
    description: req.body.description
      ? String(req.body.description)
      : undefined,
    sendCaption: req.body.sendCaption
      ? String(req.body.sendCaption)
      : undefined,
    externalUrl: req.body.externalUrl
      ? String(req.body.externalUrl)
      : undefined,
    tags: req.body.tags,
    knowledgeDomainId: req.body.knowledgeDomainId
      ? Number(req.body.knowledgeDomainId)
      : undefined,
    knowledgeBaseId: req.body.knowledgeBaseId
      ? Number(req.body.knowledgeBaseId)
      : undefined,
    queueIds: Array.isArray(req.body.queueIds)
      ? req.body.queueIds.map(Number)
      : [],
    agentIds: Array.isArray(req.body.agentIds)
      ? req.body.agentIds.map(Number)
      : [],
    aiAgentIds: Array.isArray(req.body.aiAgentIds)
      ? req.body.aiAgentIds.map(Number)
      : [],
    active: parseBool(req.body.active, true),
    allowAiUse: parseBool(req.body.allowAiUse, false),
    allowHumanUse: parseBool(req.body.allowHumanUse, true),
    useForKnowledge: parseBool(req.body.useForKnowledge, false),
    useForDelivery: parseBool(req.body.useForDelivery, true)
  });

  return res.status(201).json(item);
};

export const storeUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("write", user, user.companyId);
  const file = req.file;

  if (!file) {
    throw new AppError("ERR_REPOSITORY_FILE_REQUIRED", 400);
  }

  const item = await createRepositoryItemFromUpload({
    companyId: user.companyId,
    authorUserId: currentUserId(req),
    file,
    payload: req.body as Record<string, unknown>
  });

  return res.status(201).json(item);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("write", user, user.companyId);
  const item = await updateRepositoryItem({
    companyId: user.companyId,
    itemId: Number(req.params.itemId),
    authorUserId: currentUserId(req),
    changes: {
      name: req.body.name,
      displayTitle: req.body.displayTitle,
      category: req.body.category,
      categoryId: req.body.categoryId,
      description: req.body.description,
      sendCaption: req.body.sendCaption,
      externalUrl: req.body.externalUrl,
      tags: req.body.tags,
      active: req.body.active,
      allowAiUse: req.body.allowAiUse,
      allowHumanUse: req.body.allowHumanUse,
      useForKnowledge: req.body.useForKnowledge,
      useForDelivery: req.body.useForDelivery
    },
    file: req.file,
    changeReason: req.body.changeReason
  });

  return res.json(item);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("archive", user, user.companyId);
  await archiveRepositoryItem(user.companyId, Number(req.params.itemId));
  return res.status(204).send();
};

export const favorite = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const result = await toggleRepositoryFavorite({
    companyId: user.companyId,
    userId: user.id,
    itemId: Number(req.params.itemId)
  });
  return res.json(result);
};

export const favorites = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const items = await listFavoriteRepositoryItems({
    companyId: user.companyId,
    userId: user.id,
    access: buildAccess(user),
    limit: req.query.limit ? Number(req.query.limit) : 50
  });
  return res.json(items);
};

export const recent = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const items = await listRecentRepositoryItemsForUser({
    companyId: user.companyId,
    userId: user.id,
    access: buildAccess(user),
    limit: req.query.limit ? Number(req.query.limit) : 20
  });
  return res.json(items);
};

export const popular = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const items = await listPopularRepositoryItems(
    {
      companyId: user.companyId,
      active: true,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      sortBy: "popular"
    },
    buildAccess(user)
  );
  return res.json(items);
};

export const categoriesIndex = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const categories = await listRepositoryCategories(user.companyId);
  return res.json(categories);
};

export const categoriesStore = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("admin", user, user.companyId);
  const category = await createRepositoryCategory({
    companyId: user.companyId,
    slug: String(req.body.slug),
    name: String(req.body.name),
    icon: req.body.icon ? String(req.body.icon) : undefined,
    sortOrder: req.body.sortOrder ? Number(req.body.sortOrder) : undefined,
    allowAiUse: parseBool(req.body.allowAiUse, true),
    queueIds: Array.isArray(req.body.queueIds)
      ? req.body.queueIds.map(Number)
      : []
  });
  return res.status(201).json(category);
};

export const categoriesUpdate = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("admin", user, user.companyId);
  const category = await updateRepositoryCategory({
    companyId: user.companyId,
    categoryId: Number(req.params.categoryId),
    changes: req.body
  });
  return res.json(category);
};

export const categoriesRemove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("admin", user, user.companyId);
  await archiveRepositoryCategory(user.companyId, Number(req.params.categoryId));
  return res.status(204).send();
};

export const versionsIndex = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const versions = await listItemVersions(
    user.companyId,
    Number(req.params.itemId)
  );
  return res.json(versions);
};

export const versionsCompare = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const result = await compareItemVersions({
    companyId: user.companyId,
    itemId: Number(req.params.itemId),
    versionA: Number(req.query.versionA),
    versionB: Number(req.query.versionB)
  });
  return res.json(result);
};

export const versionsRestore = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("write", user, user.companyId);
  const item = await restoreItemVersion({
    companyId: user.companyId,
    itemId: Number(req.params.itemId),
    versionNumber: Number(req.body.versionNumber),
    authorUserId: user.id,
    changeReason: req.body.changeReason
      ? String(req.body.changeReason)
      : undefined
  });
  return res.json(item);
};

export const knowledgeStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const status = await getRepositoryKnowledgeStatus(
    user.companyId,
    Number(req.params.itemId)
  );
  return res.json(status);
};

export const knowledgeReprocess = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("publish", user, user.companyId);
  const item = await reprocessRepositoryKnowledge({
    companyId: user.companyId,
    itemId: Number(req.params.itemId),
    authorUserId: user.id
  });
  return res.json(item);
};

export const knowledgeUnlink = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("publish", user, user.companyId);
  const item = await unlinkRepositoryKnowledge(
    user.companyId,
    Number(req.params.itemId)
  );
  return res.json(item);
};

export const ticketFavorite = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const result = await toggleRepositoryFavorite({
    companyId: user.companyId,
    userId: user.id,
    itemId: Number(req.params.itemId)
  });
  return res.json(result);
};

export const ticketCategories = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const categories = await listRepositoryCategories(user.companyId);
  return res.json(categories);
};

export const ticketIndex = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const ticket = await ShowTicketService(
    Number(req.params.ticketId),
    user.companyId
  );

  const view = req.query.view ? String(req.query.view) : "all";
  const access = {
    ...buildAccess(user),
    queueIds: ticket.queueId
      ? [ticket.queueId, ...(user.queues?.map(q => q.id) || [])]
      : user.queues?.map(q => q.id) || []
  };

  if (view === "favorites") {
    return res.json(
      await listFavoriteRepositoryItems({
        companyId: user.companyId,
        userId: user.id,
        access,
        limit: 100
      })
    );
  }

  if (view === "recent") {
    return res.json(
      await listRecentRepositoryItemsForUser({
        companyId: user.companyId,
        userId: user.id,
        access,
        limit: 50
      })
    );
  }

  if (view === "popular") {
    return res.json(
      await listPopularRepositoryItems(
        {
          companyId: user.companyId,
          search: req.query.search ? String(req.query.search) : undefined,
          contentType: req.query.contentType
            ? String(req.query.contentType)
            : undefined,
          categoryId: req.query.categoryId
            ? Number(req.query.categoryId)
            : undefined,
          allowHumanUse: true,
          active: true,
          limit: 100,
          sortBy: "popular"
        },
        access
      )
    );
  }

  const items = await listRepositoryForTicket({
    ticket,
    user,
    search: req.query.search ? String(req.query.search) : undefined,
    contentType: req.query.contentType
      ? String(req.query.contentType)
      : undefined,
    category: req.query.category ? String(req.query.category) : undefined,
    categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined
  });

  return res.json(await attachFavoriteFlags(items, user.companyId, user.id));
};

export const ticketSend = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("send", user, user.companyId);

  const result = await sendRepositoryItemToTicket({
    companyId: user.companyId,
    ticketId: Number(req.params.ticketId),
    itemId: Number(req.params.itemId),
    userId: user.id,
    profile: user.profile,
    caption: req.body?.caption ? String(req.body.caption) : undefined
  });

  return res.json(result);
};

export const ticketPreview = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const user = await loadUser(req);
  await assertRepositoryAccess("read", user, user.companyId);
  const ticket = await ShowTicketService(
    Number(req.params.ticketId),
    user.companyId
  );
  const item = await getRepositoryItem(user.companyId, Number(req.params.itemId));
  const access = buildRepositoryAccessForTicket(ticket, user);

  if (!canAccessRepositoryItem(item, access)) {
    throw new AppError("ERR_REPOSITORY_ACCESS_DENIED", 403);
  }

  if (!item.storageKey) {
    return res.json({
      previewType: "text",
      title: item.displayTitle || item.name,
      description: item.description,
      externalUrl: item.externalUrl,
      contentType: item.contentType
    });
  }

  await StorageService.ensureReady(user.companyId);
  const buffer = await StorageService.download(item.storageKey, user.companyId);
  const mime = resolveRepositoryMime(item);
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(item.originalFileName || item.name)}"`
  );
  return res.send(buffer);
};
