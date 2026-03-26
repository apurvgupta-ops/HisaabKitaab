import type { Group, GroupWithMembers } from '@splitwise/shared';
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

interface AddMemberResponse {
  group: GroupWithMembers;
  invited: boolean;
  email: string;
}

export const groupApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGroups: builder.query<Group[], void>({
      query: () => 'groups',
      providesTags: ['Group'],
    }),

    getGroup: builder.query<GroupWithMembers, string>({
      query: (id) => `groups/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Group', id }],
    }),

    createGroup: builder.mutation<Group, CreateGroupRequest>({
      query: (body) => ({
        url: 'groups',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Group'],
    }),

    updateGroup: builder.mutation<Group, UpdateGroupRequest>({
      query: ({ id, ...body }) => ({
        url: `groups/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Group', id }],
    }),

    deleteGroup: builder.mutation<void, string>({
      query: (id) => ({
        url: `groups/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Group'],
    }),

    addMember: builder.mutation<AddMemberResponse, AddMemberRequest>({
      query: ({ groupId, ...body }) => ({
        url: `groups/${groupId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Group', id: groupId }],
    }),

    removeMember: builder.mutation<void, RemoveMemberRequest>({
      query: ({ groupId, userId }) => ({
        url: `groups/${groupId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Group', id: groupId }],
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
