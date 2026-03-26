import { apiRequest } from '../../lib/api';

export interface ReceiptOcrResponse {
  upload: {
    key: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  };
  receipt: {
    merchant?: string;
    total?: number;
    currency?: string;
    date?: string;
    items?: Array<{ name: string; amount: number }>;
    category?: string;
    confidence?: number;
  };
}

export async function uploadReceiptForOcr(file: {
  uri: string;
  mimeType: string;
  filename: string;
}): Promise<ReceiptOcrResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.filename,
    type: file.mimeType,
  } as unknown as Blob);

  return apiRequest<ReceiptOcrResponse>('uploads/receipt', {
    method: 'POST',
    body: formData,
  });
}
