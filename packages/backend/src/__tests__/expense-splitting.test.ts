import {
  splitEqually,
  splitByPercentage,
  splitByShares,
  roundMoney,
  formatCurrency,
} from '@splitwise/shared';

describe('Expense Splitting Logic', () => {
  describe('splitEqually', () => {
    it('should split evenly divisible amounts', () => {
      const result = splitEqually(100, 4);
      expect(result).toEqual([25, 25, 25, 25]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    });

    it('should handle remainder cents correctly', () => {
      const result = splitEqually(100, 3);
      expect(result).toHaveLength(3);
      const total = result.reduce((a, b) => roundMoney(a + b), 0);
      expect(total).toBe(100);
      expect(result[0]).toBeCloseTo(33.34, 2);
      expect(result[1]).toBeCloseTo(33.33, 2);
      expect(result[2]).toBeCloseTo(33.33, 2);
    });

    it('should handle splitting between 2 people', () => {
      const result = splitEqually(99.99, 2);
      expect(result).toHaveLength(2);
      const total = roundMoney(result[0]! + result[1]!);
      expect(total).toBe(99.99);
    });

    it('should handle single person split', () => {
      const result = splitEqually(150.75, 1);
      expect(result).toEqual([150.75]);
    });

    it('should handle small amounts with many people', () => {
      const result = splitEqually(1, 7);
      expect(result).toHaveLength(7);
      const total = result.reduce((a, b) => roundMoney(a + b), 0);
      expect(total).toBe(1);
    });

    it('should handle zero amount', () => {
      const result = splitEqually(0, 3);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should handle large amounts', () => {
      const result = splitEqually(10000.01, 3);
      expect(result).toHaveLength(3);
      const total = result.reduce((a, b) => roundMoney(a + b), 0);
      expect(total).toBe(10000.01);
    });
  });

  describe('splitByPercentage', () => {
    it('should split by exact percentages', () => {
      const result = splitByPercentage(200, [50, 30, 20]);
      expect(result).toEqual([100, 60, 40]);
      expect(result.reduce((a, b) => a + b, 0)).toBe(200);
    });

    it('should handle rounding remainder', () => {
      const result = splitByPercentage(100, [33.33, 33.33, 33.34]);
      const total = result.reduce((a, b) => roundMoney(a + b), 0);
      expect(total).toBe(100);
    });

    it('should handle 100% to one person', () => {
      const result = splitByPercentage(500, [100]);
      expect(result).toEqual([500]);
    });

    it('should handle two-way 50/50 split', () => {
      const result = splitByPercentage(99.99, [50, 50]);
      const total = roundMoney(result[0]! + result[1]!);
      expect(total).toBe(99.99);
    });

    it('should handle uneven percentages', () => {
      const result = splitByPercentage(1000, [70, 20, 10]);
      expect(result).toEqual([700, 200, 100]);
    });
  });

  describe('splitByShares', () => {
    it('should split by equal shares', () => {
      const result = splitByShares(300, [1, 1, 1]);
      expect(result).toEqual([100, 100, 100]);
    });

    it('should split by different share ratios', () => {
      const result = splitByShares(100, [2, 1, 1]);
      expect(result).toEqual([50, 25, 25]);
    });

    it('should handle zero total shares', () => {
      const result = splitByShares(100, [0, 0, 0]);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should handle single share', () => {
      const result = splitByShares(250, [1]);
      expect(result).toEqual([250]);
    });

    it('should handle rounding with uneven shares', () => {
      const result = splitByShares(100, [1, 1, 1, 1, 1, 1, 1]);
      expect(result).toHaveLength(7);
      const total = result.reduce((a, b) => roundMoney(a + b), 0);
      expect(total).toBe(100);
    });

    it('should handle large share ratios', () => {
      const result = splitByShares(1000, [10, 5, 3, 2]);
      expect(result).toHaveLength(4);
      const total = result.reduce((a, b) => roundMoney(a + b), 0);
      expect(total).toBe(1000);
    });
  });

  describe('roundMoney', () => {
    it('should round to 2 decimal places', () => {
      expect(roundMoney(1.005)).toBe(1.01);
      expect(roundMoney(1.004)).toBe(1);
      expect(roundMoney(33.335)).toBe(33.34);
    });

    it('should handle whole numbers', () => {
      expect(roundMoney(100)).toBe(100);
    });

    it('should handle negative amounts', () => {
      expect(roundMoney(-1.005)).toBe(-1);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      const result = formatCurrency(1234.56, 'USD', 'en-US');
      expect(result).toContain('1,234.56');
    });

    it('should format INR correctly', () => {
      const result = formatCurrency(1234.56, 'INR', 'en-IN');
      expect(result).toContain('1,234.56');
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency(-50.25, 'USD');
      expect(result).toContain('50.25');
    });
  });
});
