import { GitInfo } from "../gitinfo";

import packageJson from "../../package.json";

export const getBuildInfo = () => ({
  environment: process.env.NODE_ENV || "development",
  backendVersion: packageJson.version,
  commitHash: GitInfo.commitHash,
  commitTimestamp: GitInfo.commitTimestamp,
  branchName: GitInfo.branchName,
  tagName: GitInfo.tagName,
  buildTimestamp: GitInfo.buildTimestamp
});
