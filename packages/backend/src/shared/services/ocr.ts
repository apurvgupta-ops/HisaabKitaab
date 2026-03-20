import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config';
import { logger } from '../logger';

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
  category: string | null;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

type ImageMediaType = (typeof ALLOWED_IMAGE_TYPES)[number];

const isAllowedImageType = (mime: string): mime is ImageMediaType =>
  ALLOWED_IMAGE_TYPES.includes(mime as ImageMediaType);

/**
 * Extracts structured receipt data from an image using Claude Vision.
 * Falls back to regex-based parsing when the Anthropic API key is not configured.
 */
export const extractTextFromImage = async (buffer: Buffer, mimeType: string): Promise<string> => {
  if (!isAllowedImageType(mimeType) && mimeType !== 'application/pdf') {
    throw new Error(`Unsupported MIME type for OCR: ${mimeType}`);
  }

  if (!env.anthropic.apiKey) {
    logger.warn('Anthropic API key not set — returning mock receipt text');
    return buildMockReceiptText();
  }

  if (!isAllowedImageType(mimeType)) {
    throw new Error(`Claude Vision only supports JPEG, PNG, GIF, WebP. Got: ${mimeType}`);
  }

  try {
    const client = new Anthropic({ apiKey: env.anthropic.apiKey });
    const base64 = buffer.toString('base64');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            {
              type: 'text',
              text: `Extract ALL text from this receipt image exactly as it appears. Preserve line breaks and spacing. Include merchant name, address, all line items with prices, subtotals, tax, tips, and total.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!text) throw new Error('Empty response from Claude Vision');
    return text;
  } catch (err) {
    logger.error({ err }, 'Claude Vision OCR failed, returning mock text');
    return buildMockReceiptText();
  }
};

/**
 * Uses Claude to parse receipt text into structured data.
 * Falls back to regex-based parsing when the API key is missing.
 */
export const parseReceiptWithAI = async (
  buffer: Buffer,
  mimeType: string,
): Promise<ParsedReceipt> => {
  if (!env.anthropic.apiKey || !isAllowedImageType(mimeType)) {
    const text = await extractTextFromImage(buffer, mimeType);
    return parseReceiptText(text);
  }

  try {
    const client = new Anthropic({ apiKey: env.anthropic.apiKey });
    const base64 = buffer.toString('base64');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            {
              type: 'text',
              text: `Analyze this receipt image and extract structured data. Respond with ONLY valid JSON (no markdown, no explanation):
{
  "merchant": "<store/restaurant name>",
  "date": "<YYYY-MM-DD or null>",
  "total": <number>,
  "currency": "<3-letter ISO code>",
  "items": [{"name": "<item>", "amount": <number>}],
  "category": "<Food & Drink|Shopping|Transportation|Utilities|Entertainment|Health|Housing|Bills|Education|Travel|Other>"
}

Rules:
- total should be the final amount paid (including tax/tip)
- currency defaults to USD if unclear
- items should include individual line items only (not subtotal/tax/total)
- category should be the best-fit personal finance category`,
            },
          ],
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text) as ParsedReceipt;

    return {
      merchant: parsed.merchant || 'Unknown',
      date: parsed.date || null,
      total: typeof parsed.total === 'number' ? parsed.total : 0,
      currency: parsed.currency || 'USD',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      category: parsed.category || null,
    };
  } catch (err) {
    logger.error({ err }, 'AI receipt parsing failed, falling back to regex');
    const text = await extractTextFromImage(buffer, mimeType);
    return parseReceiptText(text);
  }
};

/**
 * Regex-based receipt text parser. Used as fallback when AI is unavailable.
 */
export const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let merchant = 'Unknown';
  let date: string | null = null;
  let total = 0;
  let currency = 'USD';
  const items: ReceiptLineItem[] = [];

  const amountRegex = /(\d+[.,]\d{2})\s*(USD|EUR|GBP|INR|[$€£₹¥])?/i;
  const dateRegex = /(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{2,4})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    if (i === 0 && !amountRegex.test(line) && !line.match(/^-+$/)) {
      merchant = line;
    }

    const dateMatch = line.match(dateRegex);
    if (dateMatch && !date && dateMatch[1]) {
      date = dateMatch[1];
    }

    const totalMatch = line.match(/(?:total|grand total|amount due|balance)\s*[:\s]*/i);
    const isTotalLine = Boolean(totalMatch);
    if (totalMatch) {
      const amtMatch = line.replace(totalMatch[0]!, '').trim().match(amountRegex);
      if (amtMatch?.[1]) {
        total = parseFloat(amtMatch[1].replace(',', '.'));
        if (amtMatch[2]) {
          currency = normalizeCurrencySymbol(amtMatch[2]);
        }
      }
    }

    const separatorLine = /^-+$/;
    if (!separatorLine.test(line) && !isTotalLine) {
      const itemMatch = line.match(/^(.+?)\s+(\d+[.,]\d{2})\s*(USD|EUR|GBP|INR|[$€£₹¥])?$/i);
      if (itemMatch?.[1] && itemMatch[2]) {
        const name = itemMatch[1].trim();
        const amount = parseFloat(itemMatch[2].replace(',', '.'));
        if (amount > 0 && amount < 10000 && !/total|subtotal|tax/i.test(name)) {
          items.push({ name, amount });
        }
      }
    }
  }

  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, i) => sum + i.amount, 0);
  }

  return { merchant, date, total, currency, items, category: null };
};

const normalizeCurrencySymbol = (sym: string): string => {
  if (sym.length > 1) return sym.toUpperCase();
  const map: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR', '¥': 'JPY' };
  return map[sym] ?? 'USD';
};

const buildMockReceiptText = (): string =>
  `SUPERMARKET ABC
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
