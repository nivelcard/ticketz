import sequelize from "../../../../database";
import KnowledgeAsset from "../../../../models/KnowledgeAsset";
import KnowledgeAssetVersion from "../../../../models/KnowledgeAssetVersion";
import KnowledgeChunk from "../../../../models/KnowledgeChunk";
import {
  executeAtomicSwap,
  validateVersionForPublish
} from "../KnowledgeAtomicSwapService";
import { enqueueCleanupAssetVersion } from "../AiKnowledgeIngestionQueueService";

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
jest.mock("../AiKnowledgeIngestionQueueService", () => ({
  enqueueCleanupAssetVersion: jest.fn()
}));

const mockedAsset = KnowledgeAsset as jest.Mocked<typeof KnowledgeAsset>;
const mockedVersion = KnowledgeAssetVersion as jest.Mocked<
  typeof KnowledgeAssetVersion
>;
const mockedChunk = KnowledgeChunk as jest.Mocked<typeof KnowledgeChunk>;
const mockedSequelize = sequelize as jest.Mocked<typeof sequelize>;

describe("KnowledgeAtomicSwapService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects swap when version is not indexed", async () => {
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

  it("performs atomic swap and enqueues cleanup for previous version", async () => {
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
      ingestionStatus: "indexed",
      knowledgeAssetId: 1
    });
    mockedChunk.count = jest.fn().mockResolvedValue(3);
    mockedSequelize.query = jest.fn().mockResolvedValue([[{ count: 0 }]]);

    const transactionFn = jest.fn(async (cb: (t: unknown) => Promise<void>) =>
      cb({})
    );
    (mockedSequelize as { transaction: unknown }).transaction = transactionFn;
    mockedChunk.update = jest.fn().mockResolvedValue([3]);

    await executeAtomicSwap({
      companyId: 1,
      assetId: 1,
      newVersionId: 6,
      previousVersionId: 5,
      publishedByUserId: 99
    });

    expect(asset.update).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedVersionId: 6,
        lifecycleStatus: "published"
      }),
      expect.any(Object)
    );

    expect(mockedChunk.update).toHaveBeenCalledWith(
      { lifecycleStatus: "published" },
      expect.objectContaining({
        where: expect.objectContaining({ knowledgeAssetVersionId: 6 })
      })
    );

    expect(mockedChunk.update).toHaveBeenCalledWith(
      { lifecycleStatus: "archived" },
      expect.objectContaining({
        where: expect.objectContaining({ knowledgeAssetVersionId: 5 })
      })
    );

    expect(enqueueCleanupAssetVersion).toHaveBeenCalledWith({
      companyId: 1,
      assetVersionId: 5
    });
  });

  it("does not enqueue cleanup on first publish without previous version", async () => {
    const asset = {
      id: 2,
      companyId: 1,
      assetType: "text",
      lifecycleStatus: "approved",
      publishedVersionId: null,
      publishedByUserId: null,
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue(undefined)
    };

    mockedAsset.findOne = jest.fn().mockResolvedValue(asset);
    mockedVersion.findOne = jest.fn().mockResolvedValue({
      id: 7,
      ingestionStatus: "indexed",
      knowledgeAssetId: 2
    });
    mockedChunk.count = jest.fn().mockResolvedValue(2);
    mockedSequelize.query = jest.fn().mockResolvedValue([[{ count: 0 }]]);
    (mockedSequelize as { transaction: unknown }).transaction = jest.fn(
      async (cb: (t: unknown) => Promise<void>) => cb({})
    );
    mockedChunk.update = jest.fn().mockResolvedValue([2]);

    await executeAtomicSwap({
      companyId: 1,
      assetId: 2,
      newVersionId: 7,
      previousVersionId: null
    });

    expect(enqueueCleanupAssetVersion).not.toHaveBeenCalled();
  });
});
