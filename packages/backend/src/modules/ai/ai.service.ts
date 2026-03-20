import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../shared/database/prisma';
import { env } from '../../config';
import { logger } from '../../shared/logger';
import { getPeriodRange } from '@splitwise/shared';

let anthropic: Anthropic | null = null;

const getClient = (): Anthropic | null => {
  if (!env.anthropic.apiKey) return null;

  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: env.anthropic.apiKey });
  }

  return anthropic;
};

const KEYWORD_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  grocery: { category: 'Food & Drink', subcategory: 'Groceries' },
  groceries: { category: 'Food & Drink', subcategory: 'Groceries' },
  restaurant: { category: 'Food & Drink', subcategory: 'Restaurant' },
  food: { category: 'Food & Drink', subcategory: 'General' },
  coffee: { category: 'Food & Drink', subcategory: 'Coffee' },
  uber: { category: 'Transportation', subcategory: 'Ride Share' },
  lyft: { category: 'Transportation', subcategory: 'Ride Share' },
  taxi: { category: 'Transportation', subcategory: 'Taxi' },
  gas: { category: 'Transportation', subcategory: 'Fuel' },
  fuel: { category: 'Transportation', subcategory: 'Fuel' },
  rent: { category: 'Housing', subcategory: 'Rent' },
  mortgage: { category: 'Housing', subcategory: 'Mortgage' },
  electricity: { category: 'Utilities', subcategory: 'Electricity' },
  water: { category: 'Utilities', subcategory: 'Water' },
  internet: { category: 'Utilities', subcategory: 'Internet' },
  netflix: { category: 'Entertainment', subcategory: 'Streaming' },
  spotify: { category: 'Entertainment', subcategory: 'Music' },
  movie: { category: 'Entertainment', subcategory: 'Movies' },
  gym: { category: 'Health', subcategory: 'Fitness' },
  doctor: { category: 'Health', subcategory: 'Medical' },
  pharmacy: { category: 'Health', subcategory: 'Pharmacy' },
  amazon: { category: 'Shopping', subcategory: 'Online' },
  clothes: { category: 'Shopping', subcategory: 'Clothing' },
  insurance: { category: 'Bills', subcategory: 'Insurance' },
  phone: { category: 'Bills', subcategory: 'Phone' },
  salary: { category: 'Income', subcategory: 'Salary' },
  freelance: { category: 'Income', subcategory: 'Freelance' },
};

/**
 * Keyword-based fallback when no Anthropic API key is configured.
 */
const fallbackCategorize = (description: string) => {
  const lower = description.toLowerCase();

  for (const [keyword, mapping] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      return {
        category: mapping.category,
        subcategory: mapping.subcategory,
        confidence: 0.6,
        tags: [keyword],
      };
    }
  }

  return {
    category: 'Other',
    subcategory: 'Uncategorised',
    confidence: 0.3,
    tags: [],
  };
};

export const aiService = {
  /**
   * Categorises an expense description using Claude AI with keyword fallback.
   */
  async categorizeExpense(description: string, amount: number, currency: string) {
    const client = getClient();

    if (!client) {
      logger.warn('Anthropic API key not configured, using keyword fallback');
      return fallbackCategorize(description);
    }

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Categorise the following expense and respond with ONLY valid JSON (no markdown, no explanation):
{
  "category": "<main category>",
  "subcategory": "<specific subcategory>",
  "confidence": <0.0-1.0>,
  "tags": ["<relevant>", "<tags>"]
}

Expense: "${description}"
Amount: ${amount} ${currency}

Use standard personal finance categories (Food & Drink, Transportation, Housing, Utilities, Entertainment, Health, Shopping, Bills, Education, Travel, Income, Other).`,
          },
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
      const parsed = JSON.parse(text) as {
        category: string;
        subcategory: string;
        confidence: number;
        tags: string[];
      };

      return {
        category: parsed.category ?? 'Other',
        subcategory: parsed.subcategory ?? 'General',
        confidence: Math.min(Math.max(parsed.confidence ?? 0.5, 0), 1),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    } catch (err) {
      logger.error({ err }, 'AI categorisation failed, falling back to keywords');
      return fallbackCategorize(description);
    }
  },

  /**
   * Parses natural language like "spent $50 on groceries yesterday"
   * into structured expense data.
   */
  async parseNaturalLanguageExpense(text: string) {
    const client = getClient();

    if (!client) {
      logger.warn('Anthropic API key not configured, cannot parse natural language');
      return {
        amount: null,
        currency: 'USD',
        description: text,
        category: null,
        date: new Date().toISOString(),
      };
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Parse the following text into a structured expense. Respond with ONLY valid JSON (no markdown):
{
  "amount": <number or null>,
  "currency": "<3-letter ISO code>",
  "description": "<clean description>",
  "category": "<category or null>",
  "date": "<ISO date string>"
}

Today is ${today}. Interpret relative dates (yesterday, last week, etc.) accordingly.

Text: "${text}"`,
          },
        ],
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return JSON.parse(content) as {
        amount: number | null;
        currency: string;
        description: string;
        category: string | null;
        date: string;
      };
    } catch (err) {
      logger.error({ err }, 'AI natural language parsing failed');
      return {
        amount: null,
        currency: 'USD',
        description: text,
        category: null,
        date: new Date().toISOString(),
      };
    }
  },

  /**
   * Generates financial insights and spending tips based on the user's
   * transaction history for the current month.
   */
  async generateFinancialInsights(userId: string) {
    const { start, end } = getPeriodRange(new Date(), 'monthly');

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: {
        category: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryBreakdown: Record<string, number> = {};
    for (const t of transactions.filter((t) => t.type === 'expense')) {
      const cat = t.category?.name ?? 'Uncategorised';
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + Number(t.amount);
    }

    const topCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 10000) / 100 : 0,
      }));

    const summary = {
      period: { start, end },
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
      savingsRate:
        totalIncome > 0
          ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 10000) / 100
          : 0,
      transactionCount: transactions.length,
      topCategories,
    };

    const client = getClient();

    if (!client) {
      return {
        ...summary,
        tips: [
          totalExpenses > totalIncome
            ? 'Your expenses exceed your income this month. Review your top spending categories.'
            : 'You are saving money this month. Keep it up!',
          topCategories.length > 0
            ? `Your biggest expense category is ${topCategories[0]!.name} (${topCategories[0]!.percentage}% of spending).`
            : 'Start tracking expenses to get personalised insights.',
        ],
      };
    }

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Based on this monthly financial summary, provide 3-5 concise, actionable tips. Respond with ONLY a JSON array of strings.

Summary:
- Income: $${summary.totalIncome}
- Expenses: $${summary.totalExpenses}
- Savings rate: ${summary.savingsRate}%
- Top categories: ${topCategories.map((c) => `${c.name}: $${c.amount}`).join(', ')}
- Transaction count: ${summary.transactionCount}`,
          },
        ],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '[]';
      const tips = JSON.parse(text) as string[];

      return {
        ...summary,
        tips: Array.isArray(tips) ? tips : [],
      };
    } catch (err) {
      logger.error({ err }, 'AI insights generation failed');
      return {
        ...summary,
        tips: ['Unable to generate AI tips at this time. Please try again later.'],
      };
    }
  },

  /**
   * AI chat assistant that can answer questions about expenses, balances,
   * and provide financial guidance using the user's data as context.
   */
  async chat(userId: string, message: string, history: { role: string; content: string }[]) {
    const client = getClient();

    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 20,
    });

    const groups = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });

    const pendingSettlements = await prisma.settlement.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }], status: 'pending' },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } },
        group: { select: { name: true } },
      },
      take: 10,
    });

    const contextSummary = buildChatContext(recentTransactions, groups, pendingSettlements, userId);

    if (!client) {
      return generateFallbackResponse(message, contextSummary);
    }

    try {
      const messages: { role: 'user' | 'assistant'; content: string }[] = [
        ...history.slice(-10).map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: `You are a helpful financial assistant for a Splitwise-like expense splitting app. You help users understand their expenses, debts, and finances. Be concise, friendly, and actionable. Use the following user context:

${contextSummary}

If the user asks to add an expense or perform an action, explain how to do it in the app rather than doing it directly. Format currency amounts properly. Keep responses under 200 words.`,
        messages,
      });

      const reply = response.content[0]?.type === 'text' ? response.content[0].text : '';
      return {
        reply,
        intent: detectIntent(message),
      };
    } catch (err) {
      logger.error({ err }, 'AI chat failed');
      return generateFallbackResponse(message, contextSummary);
    }
  },
};

function buildChatContext(
  transactions: {
    amount: unknown;
    type: string;
    description: string;
    category: { name: string } | null;
    date: Date;
  }[],
  groups: { group: { id: string; name: string } }[],
  settlements: {
    amount: unknown;
    fromUser: { name: string };
    toUser: { name: string };
    group: { name: string };
  }[],
  _userId: string,
): string {
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0);

  const groupNames = groups.map((g) => g.group.name).join(', ') || 'None';

  const pendingDebts = settlements
    .map(
      (s) =>
        `${s.fromUser.name} owes ${s.toUser.name} $${Number(s.amount).toFixed(2)} (${s.group.name})`,
    )
    .join('; ');

  return `Recent spending: $${totalExpenses.toFixed(2)} | Recent income: $${totalIncome.toFixed(2)} | Groups: ${groupNames} | Pending settlements: ${pendingDebts || 'None'} | Recent transactions: ${transactions.length}`;
}

function detectIntent(message: string): string | null {
  const lower = message.toLowerCase();
  if (/how much.*owe|what.*owe|balance/i.test(lower)) return 'check_balance';
  if (/add.*expense|create.*expense|log.*expense/i.test(lower)) return 'add_expense';
  if (/settle|pay.*back|send.*money/i.test(lower)) return 'settle_up';
  if (/spend|spending|budget/i.test(lower)) return 'spending_summary';
  if (/group|split/i.test(lower)) return 'group_info';
  return null;
}

function generateFallbackResponse(
  message: string,
  context: string,
): { reply: string; intent: string | null } {
  const intent = detectIntent(message);
  let reply: string;

  switch (intent) {
    case 'check_balance':
      reply = `Here's a quick look at your finances: ${context}. Head to your group page to see detailed balances.`;
      break;
    case 'add_expense':
      reply =
        'To add an expense, go to a group page and click "Add Expense". You can also use the Smart Categorize page to let AI help categorize it.';
      break;
    case 'settle_up':
      reply =
        'To settle up, go to your group page, click "Settle Up", and choose a payment method. You can also send a nudge reminder to friends who owe you.';
      break;
    case 'spending_summary':
      reply = `Your recent financial summary: ${context}. Visit the Insights page for a detailed AI-powered breakdown.`;
      break;
    default:
      reply = `I can help you with expenses, balances, settlements, and budgets. ${context ? `Here's your current summary: ${context}` : 'Ask me anything about your finances!'}`;
  }

  return { reply, intent };
}
