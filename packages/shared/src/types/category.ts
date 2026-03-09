export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parentId: string | null;
  userId: string | null;
  isSystem: boolean;
  createdAt: Date;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export const SYSTEM_CATEGORIES = [
  { name: 'Food & Dining', icon: 'utensils', color: '#FF6B6B' },
  { name: 'Transport', icon: 'car', color: '#4ECDC4' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#45B7D1' },
  { name: 'Entertainment', icon: 'film', color: '#96CEB4' },
  { name: 'Bills & Utilities', icon: 'zap', color: '#FFEAA7' },
  { name: 'Healthcare', icon: 'heart-pulse', color: '#DDA0DD' },
  { name: 'Education', icon: 'graduation-cap', color: '#87CEEB' },
  { name: 'Travel', icon: 'plane', color: '#F0E68C' },
  { name: 'Groceries', icon: 'apple', color: '#98FB98' },
  { name: 'Rent & Housing', icon: 'home', color: '#FFB6C1' },
  { name: 'Insurance', icon: 'shield', color: '#B0C4DE' },
  { name: 'Gifts & Donations', icon: 'gift', color: '#FF69B4' },
  { name: 'Personal Care', icon: 'scissors', color: '#DEB887' },
  { name: 'Investments', icon: 'trending-up', color: '#32CD32' },
  { name: 'Salary', icon: 'banknote', color: '#00CED1' },
  { name: 'Freelance', icon: 'laptop', color: '#9370DB' },
  { name: 'Other', icon: 'more-horizontal', color: '#A9A9A9' },
] as const;
