import type {
  Group,
  GroupWithMembers,
} from '@splitwise/shared';
import { apiSlice } from './apiSlice';

interface CreateGroupRequest {
  name: string;
  type: string;
  currency?: string;
  settings?: {
    simplifyDebts?: boolean;
    defaultSplitType?: string;
    allowSettlements?: boolean;
  };
}

interface UpdateGroupRequest {
  id: string;
  name?: string;
  type?: string;
  currency?: string;
  settings?: {
    simplifyDebts?: boolean;
    defaultSplitType?: string;
    allowSettlements?: boolean;
  };
}

interface AddMemberRequest {
  groupId: string;
  email: string;
  role?: string;
}

interface RemoveMemberRequest {
  groupId: string;
  userId: string;
}

export const groupApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query<Group[], void>({
      query: () => '/api/groups',
      providesTags: ['Group'],
    }),

    getGroup: builder.query<GroupWithMembers, string>({
      query: (id) => `/api/groups/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Group', id }],
    }),

    createGroup: builder.mutation<Group, CreateGroupRequest>({
      query: (body) => ({
        url: '/api/groups',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Group'],
    }),

    updateGroup: builder.mutation<Group, UpdateGroupRequest>({
      query: ({ id, ...body }) => ({
        url: `/api/groups/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Group', id }],
    }),

    deleteGroup: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/groups/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Group'],
    }),

    addMember: builder.mutation<GroupWithMembers, AddMemberRequest>({
      query: ({ groupId, ...body }) => ({
        url: `/api/groups/${groupId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group', id: groupId },
      ],
    }),

    removeMember: builder.mutation<void, RemoveMemberRequest>({
      query: ({ groupId, userId }) => ({
        url: `/api/groups/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: 'Group', id: groupId },
      ],
    }),

  }),
});

export const {
  useGetGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
} = groupApi;
