/**
 * Feature flags control which features are enabled for users.
 * Flags can be globally on/off, or use rollout percentages and target user IDs.
 */
export type FeatureFlags = Record<string, boolean>;

export interface FeatureFlagDefinition {
  key: string;
  enabled: boolean;
  rolloutPercent?: number;
  targetUserIds?: string[];
  description?: string;
}
