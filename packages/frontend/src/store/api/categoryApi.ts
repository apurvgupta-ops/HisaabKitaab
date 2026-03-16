import type { Category } from '@splitwise/shared';
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
    getCategories: builder.query<Category[], void>({
      query: () => 'categories',
      providesTags: ['Category'],
    }),

    createCategory: builder.mutation<Category, CreateCategoryRequest>({
      query: (body) => ({
        url: 'categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    updateCategory: builder.mutation<Category, UpdateCategoryRequest>({
      query: ({ id, ...body }) => ({
        url: `categories/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Category'],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `categories/${id}`,
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
