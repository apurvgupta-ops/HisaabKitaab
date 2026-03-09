import type { ApiResponse, Category } from '@splitwise/shared';
import { apiSlice } from './apiSlice';

interface CreateCategoryRequest {
  name: string;
  icon: string;
  color: string;
  parentId?: string;
}

interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}

export const categoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<ApiResponse<Category[]>, void>({
      query: () => '/api/categories',
      providesTags: ['Category'],
    }),

    createCategory: builder.mutation<
      ApiResponse<Category>,
      CreateCategoryRequest
    >({
      query: (body) => ({
        url: '/api/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    updateCategory: builder.mutation<
      ApiResponse<Category>,
      UpdateCategoryRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Category'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
