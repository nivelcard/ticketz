import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Contact from "../models/Contact";
import {
  exportContactMemory,
  enqueueManualMemoryUpsert,
  listContactMemory,
  patchContactMemory,
  softDeleteAllContactMemory
} from "../services/AiServices/ContactMemory/ContactAiMemoryService";
import {
  getContactMemoryStatus,
  isContactMemoryEnabledForCompany
} from "../services/AiServices/ContactMemory/AiContactMemoryFeatureFlag";
import {
  ContactAiMemoryCandidate,
  VerificationStatus
} from "../services/AiServices/ContactMemory/ContactAiMemoryPolicy";

const parseContactId = (value: string): number => {
  const contactId = Number(value);
  if (!Number.isFinite(contactId) || contactId <= 0) {
    throw new AppError("Invalid contactId", 400);
  }
  return contactId;
};

export const status = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const payload = await getContactMemoryStatus(companyId);
  return res.json(payload);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const contactId = parseContactId(req.params.contactId);

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });
  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  const rows = await listContactMemory(companyId, contactId);
  return res.json(rows);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userIdRaw } = req.user;
  const userId = Number(userIdRaw);
  const contactId = parseContactId(req.params.contactId);

  const enabled = await isContactMemoryEnabledForCompany(companyId);
  if (!enabled) {
    throw new AppError("Contact memory is disabled", 403);
  }

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });
  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  const candidate: ContactAiMemoryCandidate = {
    memoryType: "human_note",
    category: req.body.category || null,
    key: String(req.body.key || ""),
    value: String(req.body.value || ""),
    verificationStatus: "human_verified",
    source: "human"
  };

  await enqueueManualMemoryUpsert({
    companyId,
    contactId,
    ticketId: req.body.ticketId ? Number(req.body.ticketId) : undefined,
    aiAgentId: req.body.aiAgentId ? Number(req.body.aiAgentId) : undefined,
    userId,
    candidate,
    messageId: req.body.messageId
  });

  return res.status(202).json({ queued: true });
};

export const patch = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userIdRaw } = req.user;
  const userId = Number(userIdRaw);
  const contactId = parseContactId(req.params.contactId);
  const memoryId = Number(req.params.memoryId);

  if (!Number.isFinite(memoryId) || memoryId <= 0) {
    throw new AppError("Invalid memoryId", 400);
  }

  const updated = await patchContactMemory({
    companyId,
    contactId,
    memoryId,
    verificationStatus: req.body.verificationStatus as VerificationStatus,
    softDelete: req.body.softDelete === true,
    userId,
    reason: req.body.reason
  });

  if (!updated) {
    throw new AppError("Memory not found or update blocked", 404);
  }

  return res.json(updated);
};

export const exportMemory = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const contactId = parseContactId(req.params.contactId);

  const contact = await Contact.findOne({
    where: { id: contactId, companyId }
  });
  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  const payload = await exportContactMemory(companyId, contactId);
  return res.json({ contactId, items: payload });
};

export const removeAll = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userIdRaw } = req.user;
  const userId = Number(userIdRaw);
  const contactId = parseContactId(req.params.contactId);

  const deletedCount = await softDeleteAllContactMemory({
    companyId,
    contactId,
    userId,
    reason: req.body?.reason
  });

  return res.json({ deletedCount });
};
