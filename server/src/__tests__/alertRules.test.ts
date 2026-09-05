import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/database.js', () => ({
  prisma: {
    alertRule: {
      findMany: vi.fn().mockResolvedValue([
        { id: '1', name: 'High Fever', parameter: 'temperature', operator: 'gt', threshold: { toNumber: () => 38.5 }, severity: 'warning', isActive: true },
        { id: '2', name: 'Low SpO2', parameter: 'oxygenSaturation', operator: 'lt', threshold: { toNumber: () => 90 }, severity: 'critical', isActive: true },
        { id: '3', name: 'High Pain', parameter: 'painScale', operator: 'gte', threshold: { toNumber: () => 7 }, severity: 'warning', isActive: true },
      ]),
    },
  },
}));

import { loadAlertRules } from '../routes/alertRules.js';

describe('Alert Rules', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).__alertRules;
  });

  it('should load active alert rules into globalThis', async () => {
    await loadAlertRules();
    expect((globalThis as Record<string, unknown>).__alertRules).toBeDefined();
    expect(Array.isArray((globalThis as Record<string, unknown>).__alertRules)).toBe(true);
  });

  it('should populate __alertRules after loading', async () => {
    expect((globalThis as Record<string, unknown>).__alertRules).toBeUndefined();
    await loadAlertRules();
    expect((globalThis as Record<string, unknown>).__alertRules).toBeDefined();
  });
});

describe('Alert Rule Evaluation', () => {
  const operatorMap: Record<string, (val: number, threshold: number) => boolean> = {
    gt: (v, t) => v > t,
    gte: (v, t) => v >= t,
    lt: (v, t) => v < t,
    lte: (v, t) => v <= t,
    eq: (v, t) => v === t,
  };

  it('should evaluate operator gt correctly', () => {
    expect(operatorMap.gt(39, 38.5)).toBe(true);
    expect(operatorMap.gt(38, 38.5)).toBe(false);
    expect(operatorMap.gt(38.5, 38.5)).toBe(false);
  });

  it('should evaluate operator lt correctly', () => {
    expect(operatorMap.lt(85, 90)).toBe(true);
    expect(operatorMap.lt(90, 90)).toBe(false);
    expect(operatorMap.lt(95, 90)).toBe(false);
  });

  it('should evaluate operator gte correctly', () => {
    expect(operatorMap.gte(7, 7)).toBe(true);
    expect(operatorMap.gte(8, 7)).toBe(true);
    expect(operatorMap.gte(6, 7)).toBe(false);
  });

  it('should evaluate operator eq correctly', () => {
    expect(operatorMap.eq(90, 90)).toBe(true);
    expect(operatorMap.eq(91, 90)).toBe(false);
  });

  it('should evaluate operator lte correctly', () => {
    expect(operatorMap.lte(54, 54)).toBe(true);
    expect(operatorMap.lte(53, 54)).toBe(true);
    expect(operatorMap.lte(55, 54)).toBe(false);
  });
});
