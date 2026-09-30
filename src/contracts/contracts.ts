import { adminConfig } from "./admin/config.contract";
import { adminFeatureFlagSegments } from "./admin/featureFlagSegments.contract";
import { adminFeatureFlags } from "./admin/featureFlags.contract";
import { adminHealthCheck } from "./admin/healthCheck.contract";
import { adminHeapdump } from "./admin/heapdump.contract";
import { adminLoggers } from "./admin/loggers.contract";
import { adminThreaddump } from "./admin/threaddump.contract";
import { v1Auctions } from "./v1/auctions.contract";
import { v1Auth } from "./v1/auth.contract";
import { v1FeatureFlags } from "./v1/featureFlags.contract";
import { v1HealthCheck } from "./v1/healthCheck.contract";
import { v1Users } from "./v1/users.contract";

export const contracts = {
  admin: {
    config: adminConfig,
    featureFlagSegments: adminFeatureFlagSegments,
    featureFlags: adminFeatureFlags,
    healthCheck: adminHealthCheck,
    heapdump: adminHeapdump,
    loggers: adminLoggers,
    threaddump: adminThreaddump
  },
  v1: {
    auctions: v1Auctions,
    auth: v1Auth,
    featureFlags: v1FeatureFlags,
    healthCheck: v1HealthCheck,
    users: v1Users
  }
};
