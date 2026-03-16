import type { FeatureFlags } from '@splitwise/shared';
import { apiSlice } from './apiSlice';

export const featureApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeatures: builder.query<FeatureFlags, void>({
      query: () => 'features',
      providesTags: ['FeatureFlags'],
    }),
  }),
});

export const { useGetFeaturesQuery } = featureApi;
