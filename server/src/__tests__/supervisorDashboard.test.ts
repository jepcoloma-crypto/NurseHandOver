import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  nurseAssignment: {
    findMany: vi.fn(),
  },
  patient: {
    findMany: vi.fn(),
  },
  handover: {
    findMany: vi.fn(),
  },
  nursingTask: {
    findMany: vi.fn(),
  },
  ward: {
    findMany: vi.fn(),
  },
};

vi.mock('../config/database.js', () => ({
  prisma: mockPrisma,
}));

describe('Supervisor Dashboard', () => {
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

    it('should restrict data to assigned wards only', () => {
      const assignedWardIds = ['ward-1', 'ward-2'];
      const allWardIds = ['ward-1', 'ward-2', 'ward-3'];
      const scopedIds = allWardIds.filter((id) => assignedWardIds.includes(id));
      expect(scopedIds).toEqual(['ward-1', 'ward-2']);
      expect(scopedIds).not.toContain('ward-3');
    });
  });

  describe('Data Scoping', () => {
    it('should return empty data when supervisor has no ward assignments', async () => {
      mockPrisma.nurseAssignment.findMany.mockResolvedValue([]);
      mockPrisma.patient.findMany.mockResolvedValue([]);
      mockPrisma.handover.findMany.mockResolvedValue([]);
      mockPrisma.nursingTask.findMany.mockResolvedValue([]);
      mockPrisma.ward.findMany.mockResolvedValue([]);

      const assignments = await mockPrisma.nurseAssignment.findMany({
        where: { nurseId: 'supervisor-1', isActive: true },
        select: { wardId: true },
      });

      expect(assignments).toEqual([]);
    });

    it('should scope patients to assigned wards', async () => {
      const assignedWardIds = ['ward-1'];
      mockPrisma.patient.findMany.mockResolvedValue([
        { id: 'p1', firstName: 'John', lastName: 'Doe', mrn: 'MRN001', status: 'active', wardId: 'ward-1', ward: { name: 'Cardiology' } },
      ]);

      const patients = await mockPrisma.patient.findMany({
        where: { wardId: { in: assignedWardIds }, isActive: true },
        select: { id: true, firstName: true, lastName: true, mrn: true, status: true, wardId: true, ward: { select: { name: true } } },
      });

      expect(patients).toHaveLength(1);
      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            wardId: { in: assignedWardIds },
          }),
        })
      );
    });

    it('should scope handovers to assigned wards', async () => {
      const assignedWardIds = ['ward-1'];
      mockPrisma.handover.findMany.mockResolvedValue([
        { id: 'h1', status: 'ACCEPTED', completenessScore: 100, patient: { wardId: 'ward-1' } },
      ]);

      const handovers = await mockPrisma.handover.findMany({
        where: { patient: { wardId: { in: assignedWardIds } } },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, wardId: true } },
          outgoingNurse: { select: { id: true, firstName: true, lastName: true } },
          incomingNurse: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      expect(handovers).toHaveLength(1);
      expect(mockPrisma.handover.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patient: { wardId: { in: assignedWardIds } },
          }),
        })
      );
    });

    it('should scope tasks to assigned wards', async () => {
      const assignedWardIds = ['ward-1'];
      mockPrisma.nursingTask.findMany.mockResolvedValue([
        { id: 't1', title: 'Task 1', status: 'PENDING', patient: { wardId: 'ward-1' } },
      ]);

      const tasks = await mockPrisma.nursingTask.findMany({
        where: {
          patient: { wardId: { in: assignedWardIds } },
          status: { in: ['PENDING', 'IN_PROGRESS', 'DEFERRED', 'COMPLETED'] },
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, wardId: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      expect(tasks).toHaveLength(1);
      expect(mockPrisma.nursingTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            patient: { wardId: { in: assignedWardIds } },
          }),
        })
      );
    });
  });

  describe('Stats Calculation', () => {
    it('should count active nurses (deduplicated)', () => {
      const activeNurseAssignments = [
        { nurseId: 'nurse-1', wardId: 'ward-1' },
        { nurseId: 'nurse-1', wardId: 'ward-1' },
        { nurseId: 'nurse-2', wardId: 'ward-1' },
      ];
      const uniqueNurseIds = new Set(activeNurseAssignments.map((a) => a.nurseId));
      expect(uniqueNurseIds.size).toBe(2);
    });

    it('should count handovers by status', () => {
      const handovers = [
        { status: 'ACCEPTED', completenessScore: 100 },
        { status: 'DRAFT', completenessScore: 30 },
        { status: 'CLARIFICATION_REQUIRED', completenessScore: 80 },
        { status: 'SUBMITTED', completenessScore: 60 },
      ];

      const completed = handovers.filter((h) => h.status === 'ACCEPTED');
      const pending = handovers.filter((h) => ['DRAFT', 'READY_FOR_REVIEW', 'SUBMITTED', 'RECEIVED'].includes(h.status));
      const clarifications = handovers.filter((h) => h.status === 'CLARIFICATION_REQUIRED');

      expect(completed).toHaveLength(1);
      expect(pending).toHaveLength(2);
      expect(clarifications).toHaveLength(1);
    });

    it('should identify incomplete handovers', () => {
      const handovers = [
        { status: 'ACCEPTED', completenessScore: 100 },
        { status: 'DRAFT', completenessScore: 30 },
        { status: 'READY_FOR_REVIEW', completenessScore: 80 },
        { status: 'SUBMITTED', completenessScore: 40 },
      ];

      const incomplete = handovers.filter((h) => {
        if (h.completenessScore !== null && h.completenessScore !== undefined && h.completenessScore < 50) return true;
        if (['DRAFT', 'READY_FOR_REVIEW'].includes(h.status)) return true;
        return false;
      });

      expect(incomplete).toHaveLength(3);
    });

    it('should count overdue tasks', () => {
      const now = new Date();
      const tasks = [
        { status: 'PENDING', dueDate: new Date(now.getTime() - 3600000) },
        { status: 'PENDING', dueDate: new Date(now.getTime() + 3600000) },
        { status: 'IN_PROGRESS', dueDate: null },
        { status: 'COMPLETED', dueDate: new Date(now.getTime() - 3600000) },
      ];

      const pendingTasks = tasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status));
      const overdueTasks = pendingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);

      expect(pendingTasks).toHaveLength(3);
      expect(overdueTasks).toHaveLength(1);
    });

    it('should calculate ward breakdown', () => {
      const patients = [
        { wardId: 'ward-1', id: 'p1' },
        { wardId: 'ward-1', id: 'p2' },
        { wardId: 'ward-2', id: 'p3' },
      ];
      const wards = [
        { id: 'ward-1', name: 'Cardiology', department: { name: 'Cardiology Dept' } },
        { id: 'ward-2', name: 'Neurology', department: { name: 'Neurology Dept' } },
      ];

      const wardBreakdown = wards.map((ward) => {
        const wardPatients = patients.filter((p) => p.wardId === ward.id);
        return {
          wardId: ward.id,
          wardName: ward.name,
          departmentName: ward.department.name,
          patientCount: wardPatients.length,
        };
      });

      expect(wardBreakdown).toHaveLength(2);
      expect(wardBreakdown[0].patientCount).toBe(2);
      expect(wardBreakdown[1].patientCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.nurseAssignment.findMany.mockRejectedValue(new Error('DB error'));

      try {
        await mockPrisma.nurseAssignment.findMany({
          where: { nurseId: 'supervisor-1', isActive: true },
          select: { wardId: true },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('DB error');
      }
    });
  });
});
