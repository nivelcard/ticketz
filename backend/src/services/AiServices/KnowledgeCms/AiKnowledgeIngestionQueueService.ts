import Queue, { Job } from "bull";
import KnowledgeIngestionJob from "../../../models/KnowledgeIngestionJob";
import { logger } from "../../../utils/logger";
import { ingestKnowledgeAssetVersion } from "./ingestKnowledgeAssetVersion";
import { handlePostIndexPublish } from "./KnowledgePublishService";
import { executeAtomicSwap } from "./KnowledgeAtomicSwapService";
import {
  cleanupArchivedVersionChunks,
  unpublishKnowledgeAsset
} from "./KnowledgeUnpublishService";
import {
  getKnowledgeAsset,
  createNewAssetVersionFromCurrent
} from "./KnowledgeAssetCmsService";

export type IndexAssetVersionJob = {
  companyId: number;
  assetVersionId: number;
  autoPublish?: boolean;
  publishedByUserId?: number;
  rawText?: string;
};

export type PublishAssetSwapJob = {
  companyId: number;
  assetId: number;
  newVersionId: number;
  previousVersionId?: number | null;
  publishedByUserId?: number;
};

export type ReindexAssetJob = {
  companyId: number;
  assetId: number;
  userId?: number;
};

export type UnpublishAssetJob = {
  companyId: number;
  assetId: number;
};

export type CleanupAssetVersionJob = {
  companyId: number;
  assetVersionId: number;
};

type IngestionJobName =
  | "index-asset-version"
  | "publish-asset-swap"
  | "reindex-asset"
  | "unpublish-asset"
  | "cleanup-asset-version";

const connection = process.env.REDIS_URI || "";

const parsePositiveInt = (
  value: string | undefined,
  fallback: number
): number =>
  Number.isFinite(Number(value)) && Number(value) > 0
    ? Number(value)
    : fallback;

const getConcurrency = (): number =>
  parsePositiveInt(process.env.AI_KB_INGESTION_CONCURRENCY, 2);

const getMaxAttempts = (): number =>
  parsePositiveInt(process.env.AI_KB_INGESTION_MAX_ATTEMPTS, 3);

const getBackoffMs = (): number =>
  parsePositiveInt(process.env.AI_KB_INGESTION_BACKOFF_MS, 5000);

let aiKnowledgeIngestionQueue: Queue.Queue | null = null;

export const getAiKnowledgeIngestionQueue = (): Queue.Queue => {
  if (!aiKnowledgeIngestionQueue) {
    aiKnowledgeIngestionQueue = new Queue(
      "AiKnowledgeIngestionQueue",
      connection
    );
  }
  return aiKnowledgeIngestionQueue;
};

const persistIngestionJob = async (input: {
  companyId: number;
  jobType: string;
  scopeType?: string;
  scopeId?: number;
  knowledgeAssetId?: number;
  knowledgeAssetVersionId?: number;
  bullJobId: string;
}): Promise<KnowledgeIngestionJob> =>
  KnowledgeIngestionJob.create({
    companyId: input.companyId,
    scopeType: input.scopeType || "asset",
    scopeId: input.scopeId || input.knowledgeAssetId || null,
    knowledgeAssetId: input.knowledgeAssetId || null,
    knowledgeAssetVersionId: input.knowledgeAssetVersionId || null,
    jobType: input.jobType,
    bullJobId: input.bullJobId,
    status: "queued",
    attempts: 0,
    startedAt: null,
    finishedAt: null
  });

const markJobRunning = async (
  record: KnowledgeIngestionJob,
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
  record: KnowledgeIngestionJob,
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

const addQueueJob = async <T>(
  name: IngestionJobName,
  data: T,
  persistMeta: Omit<
    Parameters<typeof persistIngestionJob>[0],
    "bullJobId" | "jobType"
  >
): Promise<Job<T>> => {
  const queue = getAiKnowledgeIngestionQueue();
  const job = await queue.add(name, data, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: getMaxAttempts(),
    backoff: { type: "exponential", delay: getBackoffMs() }
  });

  await persistIngestionJob({
    ...persistMeta,
    jobType: name,
    bullJobId: String(job.id)
  });

  return job;
};

export const enqueueIndexAssetVersion = async (
  input: IndexAssetVersionJob
): Promise<Job<IndexAssetVersionJob>> =>
  addQueueJob("index-asset-version", input, {
    companyId: input.companyId,
    knowledgeAssetVersionId: input.assetVersionId,
    knowledgeAssetId: undefined
  });

export const enqueuePublishAssetSwap = async (
  input: PublishAssetSwapJob
): Promise<Job<PublishAssetSwapJob>> =>
  addQueueJob("publish-asset-swap", input, {
    companyId: input.companyId,
    knowledgeAssetId: input.assetId,
    knowledgeAssetVersionId: input.newVersionId
  });

export const enqueueReindexAsset = async (
  input: ReindexAssetJob
): Promise<Job<ReindexAssetJob>> =>
  addQueueJob("reindex-asset", input, {
    companyId: input.companyId,
    knowledgeAssetId: input.assetId
  });

export const enqueueUnpublishAsset = async (
  input: UnpublishAssetJob
): Promise<Job<UnpublishAssetJob>> =>
  addQueueJob("unpublish-asset", input, {
    companyId: input.companyId,
    knowledgeAssetId: input.assetId
  });

export const enqueueCleanupAssetVersion = async (
  input: CleanupAssetVersionJob
): Promise<Job<CleanupAssetVersionJob>> =>
  addQueueJob("cleanup-asset-version", input, {
    companyId: input.companyId,
    knowledgeAssetVersionId: input.assetVersionId
  });

const findPersistedJob = async (
  bullJobId: string
): Promise<KnowledgeIngestionJob | null> =>
  KnowledgeIngestionJob.findOne({ where: { bullJobId: String(bullJobId) } });

const handleIndexAssetVersion = async (
  job: Job<IndexAssetVersionJob>
): Promise<void> => {
  const record = await findPersistedJob(String(job.id));
  if (record) {
    await markJobRunning(record, job.attemptsMade + 1);
  }

  try {
    await ingestKnowledgeAssetVersion(
      job.data.companyId,
      job.data.assetVersionId,
      job.data.rawText
    );

    if (job.data.autoPublish) {
      await handlePostIndexPublish({
        companyId: job.data.companyId,
        assetVersionId: job.data.assetVersionId,
        publishedByUserId: job.data.publishedByUserId
      });
    }

    if (record) {
      await markJobFinished(record, "completed");
    }
  } catch (error) {
    if (record) {
      await markJobFinished(
        record,
        "failed",
        error instanceof Error ? error.message : "index_failed"
      );
    }
    throw error;
  }
};

const handlePublishAssetSwap = async (
  job: Job<PublishAssetSwapJob>
): Promise<void> => {
  const record = await findPersistedJob(String(job.id));
  if (record) {
    await markJobRunning(record, job.attemptsMade + 1);
  }

  try {
    await executeAtomicSwap({
      companyId: job.data.companyId,
      assetId: job.data.assetId,
      newVersionId: job.data.newVersionId,
      previousVersionId: job.data.previousVersionId,
      publishedByUserId: job.data.publishedByUserId
    });
    if (record) {
      await markJobFinished(record, "completed");
    }
  } catch (error) {
    if (record) {
      await markJobFinished(
        record,
        "failed",
        error instanceof Error ? error.message : "swap_failed"
      );
    }
    throw error;
  }
};

const handleReindexAsset = async (job: Job<ReindexAssetJob>): Promise<void> => {
  const record = await findPersistedJob(String(job.id));
  if (record) {
    await markJobRunning(record, job.attemptsMade + 1);
  }

  try {
    const asset = await getKnowledgeAsset(job.data.companyId, job.data.assetId);
    const version = await createNewAssetVersionFromCurrent(
      job.data.companyId,
      asset.id,
      job.data.userId,
      "Queue reindex"
    );

    await ingestKnowledgeAssetVersion(job.data.companyId, version.id);

    if (asset.lifecycleStatus === "published") {
      await executeAtomicSwap({
        companyId: job.data.companyId,
        assetId: asset.id,
        newVersionId: version.id,
        previousVersionId: asset.publishedVersionId,
        publishedByUserId: job.data.userId
      });
    }

    if (record) {
      await markJobFinished(record, "completed");
    }
  } catch (error) {
    if (record) {
      await markJobFinished(
        record,
        "failed",
        error instanceof Error ? error.message : "reindex_failed"
      );
    }
    throw error;
  }
};

const handleUnpublishAsset = async (
  job: Job<UnpublishAssetJob>
): Promise<void> => {
  const record = await findPersistedJob(String(job.id));
  if (record) {
    await markJobRunning(record, job.attemptsMade + 1);
  }

  try {
    await unpublishKnowledgeAsset(job.data.companyId, job.data.assetId);
    if (record) {
      await markJobFinished(record, "completed");
    }
  } catch (error) {
    if (record) {
      await markJobFinished(
        record,
        "failed",
        error instanceof Error ? error.message : "unpublish_failed"
      );
    }
    throw error;
  }
};

const handleCleanupAssetVersion = async (
  job: Job<CleanupAssetVersionJob>
): Promise<void> => {
  const record = await findPersistedJob(String(job.id));
  if (record) {
    await markJobRunning(record, job.attemptsMade + 1);
  }

  try {
    await cleanupArchivedVersionChunks(
      job.data.companyId,
      job.data.assetVersionId
    );
    if (record) {
      await markJobFinished(record, "completed");
    }
  } catch (error) {
    if (record) {
      await markJobFinished(
        record,
        "failed",
        error instanceof Error ? error.message : "cleanup_failed"
      );
    }
    throw error;
  }
};

export const startAiKnowledgeIngestionQueue = (): void => {
  const queue = getAiKnowledgeIngestionQueue();
  const concurrency = getConcurrency();

  queue.process("index-asset-version", concurrency, handleIndexAssetVersion);
  queue.process("publish-asset-swap", concurrency, handlePublishAssetSwap);
  queue.process("reindex-asset", concurrency, handleReindexAsset);
  queue.process("unpublish-asset", concurrency, handleUnpublishAsset);
  queue.process(
    "cleanup-asset-version",
    concurrency,
    handleCleanupAssetVersion
  );

  queue.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, name: job?.name, error },
      "AI knowledge ingestion job failed"
    );
  });

  logger.info(
    { concurrency, maxAttempts: getMaxAttempts() },
    "AI knowledge ingestion queue started"
  );
};
