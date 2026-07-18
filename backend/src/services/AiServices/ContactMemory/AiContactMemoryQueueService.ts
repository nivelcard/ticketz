import Queue, { Job } from "bull";
import crypto from "crypto";
import ContactAiMemoryJob from "../../../models/ContactAiMemoryJob";
import { logger } from "../../../utils/logger";
import {
  ContactAiMemoryCandidate,
  validateMemoryCandidate
} from "./ContactAiMemoryPolicy";
import { persistMemoryCandidate } from "./ContactAiMemoryService";

export type PersistContactMemoryJob = {
  companyId: number;
  contactId: number;
  ticketId: number | null;
  messageId?: string;
  aiAgentId: number | null;
  candidates: ContactAiMemoryCandidate[];
  idempotencyKey: string;
  actorType?: string;
  actorId?: number | null;
};

const connection = process.env.REDIS_URI || "";

const parsePositiveInt = (
  value: string | undefined,
  fallback: number
): number =>
  Number.isFinite(Number(value)) && Number(value) > 0
    ? Number(value)
    : fallback;

const getConcurrency = (): number =>
  parsePositiveInt(process.env.AI_MEMORY_QUEUE_CONCURRENCY, 2);

const getMaxAttempts = (): number =>
  parsePositiveInt(process.env.AI_MEMORY_JOB_MAX_ATTEMPTS, 5);

const getBackoffMs = (): number =>
  parsePositiveInt(process.env.AI_MEMORY_JOB_BACKOFF_MS, 5000);

let aiContactMemoryQueue: Queue.Queue | null = null;

export const getAiContactMemoryQueue = (): Queue.Queue => {
  if (!aiContactMemoryQueue) {
    aiContactMemoryQueue = new Queue("AiContactMemoryQueue", connection);
  }
  return aiContactMemoryQueue;
};

const hashPayload = (data: PersistContactMemoryJob): string =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(data.candidates))
    .digest("hex");

const findExistingJob = async (
  idempotencyKey: string
): Promise<ContactAiMemoryJob | null> =>
  ContactAiMemoryJob.findOne({ where: { idempotencyKey } });

const markJobRunning = async (
  record: ContactAiMemoryJob,
  attempts: number
): Promise<void> => {
  await record.update({
    status: "processing",
    attempts,
    startedAt: new Date(),
    errorMessage: null
  });
};

const markJobFinished = async (
  record: ContactAiMemoryJob,
  status: "completed" | "failed",
  errorMessage?: string
): Promise<void> => {
  const finishedAt = new Date();
  const latencyMs = record.startedAt
    ? finishedAt.getTime() - record.startedAt.getTime()
    : null;

  await record.update({
    status,
    finishedAt,
    latencyMs,
    errorMessage: errorMessage || null
  });
};

export const enqueuePersistContactMemory = async (
  data: PersistContactMemoryJob
): Promise<Job<PersistContactMemoryJob> | null> => {
  const existing = await findExistingJob(data.idempotencyKey);
  if (
    existing &&
    ["queued", "processing", "completed"].includes(existing.status)
  ) {
    return null;
  }

  const queue = getAiContactMemoryQueue();
  const job = await queue.add("persist-contact-memory", data, {
    removeOnComplete: 200,
    removeOnFail: 100,
    attempts: getMaxAttempts(),
    backoff: { type: "exponential", delay: getBackoffMs() },
    priority: 10
  });

  await ContactAiMemoryJob.create({
    companyId: data.companyId,
    contactId: data.contactId,
    ticketId: data.ticketId,
    idempotencyKey: data.idempotencyKey,
    bullJobId: String(job.id),
    status: "queued",
    attempts: 0,
    payloadHash: hashPayload(data)
  });

  return job;
};

const handlePersistContactMemory = async (
  job: Job<PersistContactMemoryJob>
): Promise<void> => {
  const record = await ContactAiMemoryJob.findOne({
    where: { idempotencyKey: job.data.idempotencyKey }
  });

  if (record) {
    await markJobRunning(record, job.attemptsMade + 1);
  }

  try {
    await Promise.all(
      job.data.candidates.map(async candidate => {
        const policy = validateMemoryCandidate(candidate);
        if (!policy.allowed) {
          return;
        }

        await persistMemoryCandidate({
          companyId: job.data.companyId,
          contactId: job.data.contactId,
          ticketId: job.data.ticketId,
          messageId: job.data.messageId,
          aiAgentId: job.data.aiAgentId,
          actorType: job.data.actorType || "job",
          actorId: job.data.actorId || null,
          candidate: policy.candidate
        });
      })
    );

    if (record) {
      await markJobFinished(record, "completed");
    }
  } catch (error) {
    if (record) {
      await markJobFinished(
        record,
        "failed",
        error instanceof Error ? error.message : "persist_failed"
      );
    }
    throw error;
  }
};

export const startAiContactMemoryQueue = (): void => {
  const queue = getAiContactMemoryQueue();
  const concurrency = getConcurrency();

  queue.process(
    "persist-contact-memory",
    concurrency,
    handlePersistContactMemory
  );

  queue.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, name: job?.name, error },
      "AI contact memory job failed"
    );
  });

  logger.info(
    { concurrency, maxAttempts: getMaxAttempts() },
    "AI contact memory queue started"
  );
};
