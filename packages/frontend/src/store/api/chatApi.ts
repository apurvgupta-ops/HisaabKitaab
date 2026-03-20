import { apiSlice } from './apiSlice';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

interface ChatResponse {
  reply: string;
  intent: string | null;
}

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendChatMessage: builder.mutation<ChatResponse, ChatRequest>({
      query: (body) => ({
        url: 'ai/chat',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useSendChatMessageMutation } = chatApi;
