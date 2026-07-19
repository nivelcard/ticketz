import {
  checkRepositoryPermission,
  assertRepositoryPermission
} from "../ContentRepositoryPermissionService";
import ContentRepositoryPermission from "../../../models/ContentRepositoryPermission";
import AppError from "../../../errors/AppError";

jest.mock("../../../models/ContentRepositoryPermission");

describe("ContentRepositoryPermissionService", () => {
  const adminUser = {
    id: 1,
    companyId: 10,
    profile: "admin",
    super: false
  } as any;

  const agentUser = {
    id: 2,
    companyId: 10,
    profile: "user",
    super: false
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows admin without DB lookup", async () => {
    const allowed = await checkRepositoryPermission("write", 10, adminUser);
    expect(allowed).toBe(true);
    expect(ContentRepositoryPermission.findAll).not.toHaveBeenCalled();
  });

  it("checks DB permissions for regular users", async () => {
    (ContentRepositoryPermission.findAll as jest.Mock).mockResolvedValue([
      { permission: "send" }
    ]);

    await expect(
      assertRepositoryPermission("send", 10, agentUser)
    ).resolves.toBeUndefined();
  });

  it("denies write when user only has send permission", async () => {
    (ContentRepositoryPermission.findAll as jest.Mock).mockResolvedValue([
      { permission: "send" }
    ]);

    await expect(
      assertRepositoryPermission("write", 10, agentUser)
    ).rejects.toMatchObject({ message: "ERR_REPOSITORY_PERMISSION_DENIED" });
  });

  it("denies cross-company access", async () => {
    const allowed = await checkRepositoryPermission("read", 99, agentUser);
    expect(allowed).toBe(false);
  });
});
