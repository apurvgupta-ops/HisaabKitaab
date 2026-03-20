import { apiSlice } from './apiSlice';

interface ReceiptLineItem {
  name: string;
  amount: number;
}

interface ParsedReceipt {
  merchant: string;
  date: string | null;
  total: number;
  currency: string;
  items: ReceiptLineItem[];
  category: string | null;
}

interface UploadMeta {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface ReceiptUploadResponse {
  upload: UploadMeta;
  receipt: ParsedReceipt;
}

export const uploadApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    uploadReceipt: builder.mutation<ReceiptUploadResponse, FormData>({
      query: (formData) => ({
        url: 'uploads/receipt',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

export const { useUploadReceiptMutation } = uploadApi;
