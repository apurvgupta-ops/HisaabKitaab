/**
 * OCR receipt scanning service.
 * Basic regex-based parser for extracted text. Placeholder for Tesseract.js / AWS Textract.
 */

export interface ReceiptLineItem {
  name: string;
  amount: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: string | null;
  total: number;
  currency: string;
  items: ReceiptLineItem[];
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Extracts text from image/PDF buffer using OCR.
 * Currently returns mock text for development. Integrate Tesseract.js or AWS Textract for production.
 *
 * @param buffer - File buffer (image or PDF)
 * @param mimeType - MIME type of the file
 * @returns Extracted text as string
 */
export const extractTextFromImage = async (
  buffer: Buffer,
  mimeType: string
): Promise<string> => {
  // Placeholder for AWS Textract integration
  // const textractResult = await textractClient.send(new AnalyzeDocumentCommand({ ... }));
  // return textractResult.Blocks?.filter(b => b.BlockType === 'LINE').map(b => b.Text).join('\n') ?? '';

  // Placeholder for Tesseract.js (requires: npm install tesseract.js)
  // const { createWorker } = await import('tesseract.js');
  // const worker = await createWorker();
  // const { data } = await worker.recognize(buffer, mimeType);
  // return data.text;

  if (!ALLOWED_IMAGE_TYPES.includes(mimeType) && mimeType !== 'application/pdf') {
    throw new Error(`Unsupported MIME type for OCR: ${mimeType}`);
  }

  // Mock text for development - simulates typical receipt format
  return `SUPERMARKET ABC
123 Main Street
--------------------------------
Milk 2.49
Bread 1.99
Eggs 3.50
--------------------------------
Subtotal: 7.98
Tax: 0.80
TOTAL: 8.78 USD
Date: ${new Date().toISOString().split('T')[0]}`;
};

/**
 * Parses receipt text to extract structured data: merchant, date, total, currency, line items.
 *
 * @param text - Raw OCR-extracted text
 * @returns Structured receipt data
 */
export const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let merchant = 'Unknown';
  let date: string | null = null;
  let total = 0;
  let currency = 'USD';
  const items: ReceiptLineItem[] = [];

  // Amount patterns: 1.99, $1.99, 1,99, 10.00 USD
  const amountRegex = /(\d+[.,]\d{2})\s*(USD|EUR|GBP|INR|[$€£₹¥])?/i;
  const dateRegex = /(\d{4}-\d{2}-\d{2}|\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // First non-empty line is usually merchant name
    if (i === 0 && !amountRegex.test(line) && !line.match(/^-+$/)) {
      merchant = line;
    }

    // Match date
    const dateMatch = line.match(dateRegex);
    if (dateMatch && !date && dateMatch[1]) {
      date = dateMatch[1];
    }

    // Match total (TOTAL, Total, Grand Total, etc.)
    const totalMatch = line.match(
      /(?:total|grand total|amount due|balance)\s*[:\s]*/i
    );
    const isTotalLine = Boolean(totalMatch);
    if (totalMatch) {
      const amtMatch = line.replace(totalMatch[0]!, '').trim().match(amountRegex);
      if (amtMatch && amtMatch[1]) {
        total = parseFloat(amtMatch[1].replace(',', '.'));
        if (amtMatch[2]) {
          currency =
            amtMatch[2].length > 1
              ? amtMatch[2].toUpperCase()
              : amtMatch[2] === '$'
                ? 'USD'
                : amtMatch[2] === '€'
                  ? 'EUR'
                  : amtMatch[2] === '£'
                    ? 'GBP'
                    : amtMatch[2] === '₹'
                      ? 'INR'
                      : 'USD';
        }
      }
    }

    // Line items: "Product Name 12.99" or "Product Name $12.99"
    const separatorLine = /^-+$/;
    if (!separatorLine.test(line) && !isTotalLine) {
      const itemMatch = line.match(/^(.+?)\s+(\d+[.,]\d{2})\s*(USD|EUR|GBP|INR|[$€£₹¥])?$/i);
      if (itemMatch && itemMatch[1] && itemMatch[2]) {
        const name = itemMatch[1].trim();
        const amount = parseFloat(itemMatch[2].replace(',', '.'));
        if (amount > 0 && amount < 10000 && !/total|subtotal|tax/i.test(name)) {
          items.push({ name, amount });
        }
      }
    }
  }

  // If no total found, use sum of items as fallback
  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, i) => sum + i.amount, 0);
  }

  return {
    merchant,
    date,
    total,
    currency,
    items,
  };
};
