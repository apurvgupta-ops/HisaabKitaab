import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useGetFeaturesQuery } from '@/store/api/featureApi';

/**
 * Returns whether a feature flag is enabled for the current user.
 * Skips the API request when the user is not authenticated (returns false).
 *
 * @param key - Feature flag key (e.g. 'ai_insights', 'advanced_reports')
 * @returns boolean - true if the feature is enabled, false otherwise
 *
 * @example
 * const showAiInsights = useFeatureFlag('ai_insights');
 * if (showAiInsights) return <AiInsightsSection />;
 */
export function useFeatureFlag(key: string): boolean {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data: flags } = useGetFeaturesQuery(undefined, {
    skip: !isAuthenticated,
  });

  return useMemo(() => {
    if (!flags || typeof flags !== 'object') return false;
    return Boolean(flags[key]);
  }, [flags, key]);
}
