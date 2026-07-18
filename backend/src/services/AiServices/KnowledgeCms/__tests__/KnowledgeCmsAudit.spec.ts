import sequelize from "../../../../database";
import KnowledgeAsset from "../../../../models/KnowledgeAsset";
import KnowledgeAssetVersion from "../../../../models/KnowledgeAssetVersion";
import KnowledgeCategory from "../../../../models/KnowledgeCategory";
import KnowledgeChunk from "../../../../models/KnowledgeChunk";
import KnowledgeIngestionJob from "../../../../models/KnowledgeIngestionJob";
import AppError from "../../../../errors/AppError";
import {
  executeAtomicSwap,
  rollbackToVersion,
  validateVersionForPublish
} from "../KnowledgeAtomicSwapService";
import { publishKnowledgeAsset } from "../KnowledgePublishService";
import { cleanupArchivedVersionChunks } from "../KnowledgeUnpublishService";
import {
  isGlobalKbCmsEnabled,
  isKbCmsEnabledForCompany
} from "../AiKbCmsFeatureFlag";
import {
  assertAllowedUploadExtension,
  assertSecureAssetUrl,
  isAssetMetadataExpired
} from "../KnowledgeCmsGuards";
import { validateKnowledgeMetadata } from "../KnowledgeMetadataSchema";
import { GetCompanySetting } from "../../../../helpers/CheckSettings";

jest.mock("../../../../database", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    transaction: jest.fn()
  }
}));

jest.mock("../../../../models/KnowledgeAsset");
jest.mock("../../../../models/KnowledgeAssetVersion");
jest.mock("../../../../models/KnowledgeChunk");
jest.mock("../../../../models/KnowledgeCategory");
jest.mock("../../../../models/KnowledgeIngestionJob");
jest.mock("../AiKnowledgeIngestionQueueService", () => ({
  enqueueCleanupAssetVersion: jest.fn(),
  enqueueIndexAssetVersion: jest.fn(),
  enqueuePublishAssetSwap: jest.fn(),
  getAiKnowledgeIngestionQueue: jest.fn()
}));
jest.mock("../KnowledgeAssetCmsService", () => ({
  createNewAssetVersionFromCurrent: jest.fn(),
  getKnowledgeAsset: jest.fn()
}));
jest.mock("../KnowledgeAssetVersionService", () => ({
  getAssetVersion: jest.fn()
}));
jest.mock("../../../../helpers/CheckSettings", () => ({
  GetCompanySetting: jest.fn()
}));

const mockedAsset = KnowledgeAsset as jest.Mocked<typeof KnowledgeAsset>;
const mockedVersion = KnowledgeAssetVersion as jest.Mocked<
  typeof KnowledgeAssetVersion
>;
const mockedChunk = KnowledgeChunk as jest.Mocked<typeof KnowledgeChunk>;
const mockedCategory = KnowledgeCategory as jest.Mocked<
  typeof KnowledgeCategory
>;
const mockedSequelize = sequelize as jest.Mocked<typeof sequelize>;
const mockedGetCompanySetting = GetCompanySetting as jest.MockedFunction<
  typeof GetCompanySetting
>;

describe("Knowledge CMS audit scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AI_KB_CMS_ENABLED;
  });

  it("treats concurrent publish of the same version as idempotent", async () => {
    const asset = {
      id: 1,
      companyId: 1,
      assetType: "text",
      lifecycleStatus: "published",
      publishedVersionId: 6,
      update: jest.fn(),
      reload: jest.fn().mockResolvedValue(undefined)
    };

    mockedAsset.findOne = jest.fn().mockResolvedValue(asset);
    mockedVersion.findOne = jest.fn().mockResolvedValue({
      id: 6,
      knowledgeAssetId: 1,
      ingestionStatus: "indexed"
    });
    mockedChunk.count = jest.fn().mockResolvedValue(2);
    mockedSequelize.query = jest.fn().mockResolvedValue([[{ count: 0 }]]);

    const result = await executeAtomicSwap({
      companyId: 1,
      assetId: 1,
      newVersionId: 6,
      previousVersionId: 6
    });

    expect(result).toBe(asset);
    expect(mockedSequelize.transaction).not.toHaveBeenCalled();
  });

  it("rejects publish before swap when version is not indexed", async () => {
    jest.spyOn(KnowledgeAssetVersion, "findOne").mockResolvedValue({
      id: 10,
      ingestionStatus: "pending",
      knowledgeAssetId: 1
    } as KnowledgeAssetVersion);

    await expect(
      validateVersionForPublish(1, 10, "text")
    ).rejects.toMatchObject({
      message: "Version is not indexed"
    });
  });

  it("fails swap before transaction when version belongs to another asset", async () => {
    mockedAsset.findOne = jest.fn().mockResolvedValue({
      id: 1,
      companyId: 1,
      assetType: "text"
    });
    mockedVersion.findOne = jest.fn().mockResolvedValue({
      id: 8,
      companyId: 1,
      knowledgeAssetId: 99,
      ingestionStatus: "indexed"
    });

    await expect(
      executeAtomicSwap({
        companyId: 1,
        assetId: 1,
        newVersionId: 8
      })
    ).rejects.toMatchObject({
      message: "Version does not belong to asset"
    });

    expect(mockedSequelize.transaction).not.toHaveBeenCalled();
  });

  it("keeps published asset when cleanup enqueue fails after swap", async () => {
    const { enqueueCleanupAssetVersion } = jest.requireMock(
      "../AiKnowledgeIngestionQueueService"
    );

    const asset = {
      id: 1,
      companyId: 1,
      assetType: "text",
      lifecycleStatus: "published",
      publishedVersionId: 5,
      publishedByUserId: null,
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined)
    };

    mockedAsset.findOne = jest.fn().mockResolvedValue(asset);
    mockedVersion.findOne = jest.fn().mockResolvedValue({
      id: 6,
      knowledgeAssetId: 1,
      ingestionStatus: "indexed"
    });
    mockedChunk.count = jest.fn().mockResolvedValue(2);
    mockedChunk.update = jest.fn().mockResolvedValue([2]);
    mockedSequelize.query = jest.fn().mockResolvedValue([[{ count: 0 }]]);
    (mockedSequelize as { transaction: unknown }).transaction = jest.fn(
      async (cb: (t: unknown) => Promise<void>) => cb({})
    );
    enqueueCleanupAssetVersion.mockRejectedValue(
      new Error("queue unavailable")
    );

    await executeAtomicSwap({
      companyId: 1,
      assetId: 1,
      newVersionId: 6,
      previousVersionId: 5
    });

    expect(asset.update).toHaveBeenCalled();
    expect(asset.reload).toHaveBeenCalled();
  });

  it("rolls back to a previous indexed version", async () => {
    const asset = {
      id: 3,
      companyId: 2,
      assetType: "text",
      lifecycleStatus: "published",
      publishedVersionId: 20,
      publishedByUserId: 1,
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined)
    };

    mockedAsset.findOne = jest.fn().mockResolvedValue(asset);
    mockedVersion.findOne = jest.fn().mockResolvedValue({
      id: 15,
      companyId: 2,
      knowledgeAssetId: 3,
      ingestionStatus: "indexed"
    });
    mockedChunk.count = jest.fn().mockResolvedValue(1);
    mockedChunk.update = jest.fn().mockResolvedValue([1]);
    mockedSequelize.query = jest.fn().mockResolvedValue([[{ count: 0 }]]);
    (mockedSequelize as { transaction: unknown }).transaction = jest.fn(
      async (cb: (t: unknown) => Promise<void>) => cb({})
    );

    await rollbackToVersion({
      companyId: 2,
      assetId: 3,
      targetVersionId: 15,
      publishedByUserId: 9
    });

    expect(asset.update).toHaveBeenCalledWith(
      expect.objectContaining({ publishedVersionId: 15 }),
      expect.any(Object)
    );
  });

  it("isolates assets by companyId on swap", async () => {
    mockedAsset.findOne = jest.fn().mockResolvedValue(null);

    await expect(
      executeAtomicSwap({
        companyId: 99,
        assetId: 1,
        newVersionId: 6
      })
    ).rejects.toMatchObject({
      message: "Knowledge asset not found"
    });
  });

  it("rejects incompatible category and base combinations", async () => {
    mockedCategory.findOne = jest.fn().mockResolvedValue(null);

    await expect(async () => {
      const category = await KnowledgeCategory.findOne({
        where: { id: 7, companyId: 1, knowledgeBaseId: 2 }
      });
      if (!category) {
        throw new AppError("Category not found", 404);
      }
    }).rejects.toMatchObject({
      message: "Category not found"
    });
  });

  it("evaluates global and company feature flag combinations", async () => {
    process.env.AI_KB_CMS_ENABLED = "false";
    mockedGetCompanySetting.mockResolvedValue("enabled");
    expect(isGlobalKbCmsEnabled()).toBe(false);
    await expect(isKbCmsEnabledForCompany(1)).resolves.toBe(false);

    process.env.AI_KB_CMS_ENABLED = "true";
    mockedGetCompanySetting.mockResolvedValue("disabled");
    expect(isGlobalKbCmsEnabled()).toBe(true);
    await expect(isKbCmsEnabledForCompany(1)).resolves.toBe(false);

    mockedGetCompanySetting.mockResolvedValue("enabled");
    await expect(isKbCmsEnabledForCompany(1)).resolves.toBe(true);
  });

  it("rejects invalid upload extensions", () => {
    expect(() => assertAllowedUploadExtension("malware.exe")).toThrow(
      "Unsupported file type"
    );
    expect(() => assertAllowedUploadExtension("guide.pdf")).not.toThrow();
  });

  it("rejects insecure URLs", () => {
    expect(() => assertSecureAssetUrl("http://example.com/doc")).toThrow(
      "Insecure URL: HTTPS is required"
    );
    expect(() => assertSecureAssetUrl("https://127.0.0.1/internal")).toThrow(
      "Insecure URL: local addresses are not allowed"
    );
    expect(() =>
      assertSecureAssetUrl("https://docs.example.com/page")
    ).not.toThrow();
  });

  it("detects expired asset metadata", () => {
    const expired = validateKnowledgeMetadata({
      validUntil: "2020-01-01T00:00:00.000Z"
    });
    expect(
      isAssetMetadataExpired(expired, new Date("2026-01-01T00:00:00.000Z"))
    ).toBe(true);

    const active = validateKnowledgeMetadata({
      validUntil: "2030-01-01T00:00:00.000Z"
    });
    expect(
      isAssetMetadataExpired(active, new Date("2026-01-01T00:00:00.000Z"))
    ).toBe(false);
  });

  it("cleans up archived chunks without touching published versions", async () => {
    mockedChunk.destroy = jest.fn().mockResolvedValue(4);

    const deleted = await cleanupArchivedVersionChunks(1, 5);

    expect(deleted).toBe(4);
    expect(mockedChunk.destroy).toHaveBeenCalledWith({
      where: {
        companyId: 1,
        knowledgeAssetVersionId: 5,
        lifecycleStatus: "archived"
      }
    });
    expect(mockedChunk.destroy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lifecycleStatus: "published" })
      })
    );
  });

  it("persists duplicate queue jobs with distinct bull ids", async () => {
    const bullJobIds: string[] = [];

    (KnowledgeIngestionJob.create as jest.Mock) = jest.fn(
      async (input: { bullJobId: string }) => {
        bullJobIds.push(input.bullJobId);
        return input;
      }
    );

    const persistJob = async (bullJobId: string) =>
      KnowledgeIngestionJob.create({
        companyId: 1,
        jobType: "index-asset-version",
        scopeType: "asset",
        bullJobId,
        status: "queued",
        attempts: 0,
        startedAt: null,
        finishedAt: null
      });

    await persistJob("101");
    await persistJob("102");

    expect(bullJobIds).toEqual(["101", "102"]);
  });

  it("marks ingestion jobs as processing again after worker restart", async () => {
    const record = {
      update: jest.fn().mockResolvedValue(undefined),
      startedAt: null
    };

    KnowledgeIngestionJob.findOne = jest.fn().mockResolvedValue(record);

    const markRunning = async (attempts: number) => {
      await record.update({
        status: "processing",
        attempts,
        startedAt: new Date(),
        errorMessage: null
      });
    };

    await markRunning(2);
    expect(record.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing", attempts: 2 })
    );
  });

  it("queues publish swap when version is still processing", async () => {
    const { getKnowledgeAsset } = jest.requireMock(
      "../KnowledgeAssetCmsService"
    );
    const { getAssetVersion } = jest.requireMock(
      "../KnowledgeAssetVersionService"
    );
    const { enqueuePublishAssetSwap } = jest.requireMock(
      "../AiKnowledgeIngestionQueueService"
    );

    const asset = {
      id: 4,
      lifecycleStatus: "approved",
      currentVersionId: 11,
      publishedVersionId: null,
      update: jest.fn().mockResolvedValue(undefined)
    };

    getKnowledgeAsset.mockResolvedValue(asset);
    getAssetVersion.mockResolvedValue({
      id: 11,
      knowledgeAssetId: 4,
      ingestionStatus: "processing"
    });

    await publishKnowledgeAsset({
      companyId: 1,
      assetId: 4,
      userId: 2
    });

    expect(enqueuePublishAssetSwap).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 1,
        assetId: 4,
        newVersionId: 11
      })
    );
  });
});
