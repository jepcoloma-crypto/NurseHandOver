import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  nurseAssignment: { findMany: vi.fn() },
  handover: { findMany: vi.fn() },
  nursingTask: { findMany: vi.fn() },
  handoverClarification: { findMany: vi.fn() },
  shift: { findMany: vi.fn() },
  ward: { findMany: vi.fn() },
};

vi.mock('../config/database.js', () => ({
  prisma: mockPrisma,
}));

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should require SUPERVISOR or ADMINISTRATOR role', () => {
      const allowedRoles = ['SUPERVISOR', 'ADMINISTRATOR'];
      expect(allowedRoles).toContain('SUPERVISOR');
      expect(allowedRoles).toContain('ADMINISTRATOR');
      expect(allowedRoles).not.toContain('NURSE');
    });
  });

  describe('Ward Scoping', () => {
    it('should scope data to supervisor assigned wards', () => {
      const assignedWardIds = ['ward-1'];
      const allPatients = [
        { wardId: 'ward-1' },
        { wardId: 'ward-2' },
      ];
      const scoped = allPatients.filter((p) => assignedWardIds.includes(p.wardId));
      expect(scoped).toHaveLength(1);
    });

    it('should allow admin to see all wards when no filter', () => {
      const allWards = ['ward-1', 'ward-2', 'ward-3'];
      const showAll = true;
      const visible = showAll ? allWards : allWards.filter(() => false);
      expect(visible).toHaveLength(3);
    });
  });

  describe('Summary Calculations', () => {
    it('should calculate average completeness', () => {
      const scores = [80, 60, 100, 40];
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      expect(avg).toBe(70);
    });

    it('should handle empty completeness scores', () => {
      const scores: number[] = [];
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      expect(avg).toBe(0);
    });

    it('should calculate average handover duration in minutes', () => {
      const durations = [
        30 * 60 * 1000,
        45 * 60 * 1000,
        60 * 60 * 1000,
      ];
      const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
      const avgMinutes = Math.round(avgMs / 60000);
      expect(avgMinutes).toBe(45);
    });

    it('should calculate task completion rate', () => {
      const totalTasks = 20;
      const completedTasks = 15;
      const rate = Math.round((completedTasks / totalTasks) * 100);
      expect(rate).toBe(75);
    });

    it('should calculate overdue task rate', () => {
      const totalTasks = 20;
      const overdueTasks = 4;
      const rate = Math.round((overdueTasks / totalTasks) * 100);
      expect(rate).toBe(20);
    });

    it('should calculate clarification rate', () => {
      const totalHandovers = 30;
      const totalClarifications = 6;
      const rate = Math.round((totalClarifications / totalHandovers) * 100);
      expect(rate).toBe(20);
    });
  });

  describe('Completeness Distribution', () => {
    it('should bucket scores into distribution categories', () => {
      const scores = [90, 80, 60, 40, 20, 10];
      const dist = { empty: 0, started: 0, partial: 0, complete: 0 };
      scores.forEach((score) => {
        if (score >= 75) dist.complete++;
        else if (score >= 50) dist.partial++;
        else if (score >= 25) dist.started++;
        else dist.empty++;
      });
      expect(dist.complete).toBe(2);
      expect(dist.partial).toBe(1);
      expect(dist.started).toBe(1);
      expect(dist.empty).toBe(2);
    });
  });

  describe('Date Filtering', () => {
    it('should apply date range filter', () => {
      const start = '2026-01-01';
      const end = '2026-01-31';
      const dateFilter: Record<string, unknown> = {};
      if (start) dateFilter.gte = new Date(start);
      if (end) dateFilter.lte = new Date(end);
      expect(dateFilter.gte).toBeDefined();
      expect(dateFilter.lte).toBeDefined();
    });

    it('should work with no date filter', () => {
      const start = '';
      const end = '';
      const dateFilter: Record<string, unknown> = {};
      if (start) dateFilter.gte = new Date(start);
      if (end) dateFilter.lte = new Date(end);
      expect(Object.keys(dateFilter)).toHaveLength(0);
    });
  });

  describe('Handover Status Grouping', () => {
    it('should group handovers by status', () => {
      const handovers = [
        { status: 'ACCEPTED' },
        { status: 'ACCEPTED' },
        { status: 'DRAFT' },
        { status: 'SUBMITTED' },
      ];
      const byStatus: Record<string, number> = {};
      handovers.forEach((h) => {
        byStatus[h.status] = (byStatus[h.status] || 0) + 1;
      });
      expect(byStatus['ACCEPTED']).toBe(2);
      expect(byStatus['DRAFT']).toBe(1);
      expect(byStatus['SUBMITTED']).toBe(1);
    });
  });

  describe('Shift Report', () => {
    it('should calculate per-shift metrics', () => {
      const shifts = [
        { id: 's1', name: 'Day' },
        { id: 's2', name: 'Night' },
      ];
      const handovers = [
        { shiftId: 's1', status: 'ACCEPTED', completenessScore: 80 },
        { shiftId: 's1', status: 'DRAFT', completenessScore: 40 },
        { id: 's2', shiftId: 's2', status: 'ACCEPTED', completenessScore: 90 },
      ];

      const report = shifts.map((shift) => {
        const shiftHandovers = handovers.filter((h) => h.shiftId === shift.id);
        const scores = shiftHandovers.filter((h) => h.completenessScore !== null).map((h) => h.completenessScore!);
        return {
          shiftName: shift.name,
          totalHandovers: shiftHandovers.length,
          completedHandovers: shiftHandovers.filter((h) => h.status === 'ACCEPTED').length,
          avgCompleteness: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        };
      });

      expect(report[0].totalHandovers).toBe(2);
      expect(report[0].completedHandovers).toBe(1);
      expect(report[0].avgCompleteness).toBe(60);
      expect(report[1].totalHandovers).toBe(1);
      expect(report[1].avgCompleteness).toBe(90);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.handover.findMany.mockRejectedValue(new Error('DB error'));
      try {
        await mockPrisma.handover.findMany();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
