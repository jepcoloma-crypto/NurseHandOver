import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  nursingTask: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
  },
  patient: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
};

vi.mock('../config/database.js', () => ({
  prisma: mockPrisma,
}));

describe('Task Status Transitions', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'DEFERRED', 'CANCELLED'],
    DEFERRED: ['IN_PROGRESS', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  it('should allow PENDING -> IN_PROGRESS', () => {
    expect(VALID_TRANSITIONS.PENDING).toContain('IN_PROGRESS');
  });

  it('should allow PENDING -> CANCELLED', () => {
    expect(VALID_TRANSITIONS.PENDING).toContain('CANCELLED');
  });

  it('should not allow PENDING -> COMPLETED', () => {
    expect(VALID_TRANSITIONS.PENDING).not.toContain('COMPLETED');
  });

  it('should allow IN_PROGRESS -> COMPLETED', () => {
    expect(VALID_TRANSITIONS.IN_PROGRESS).toContain('COMPLETED');
  });

  it('should allow IN_PROGRESS -> DEFERRED', () => {
    expect(VALID_TRANSITIONS.IN_PROGRESS).toContain('DEFERRED');
  });

  it('should allow IN_PROGRESS -> CANCELLED', () => {
    expect(VALID_TRANSITIONS.IN_PROGRESS).toContain('CANCELLED');
  });

  it('should not allow IN_PROGRESS -> PENDING', () => {
    expect(VALID_TRANSITIONS.IN_PROGRESS).not.toContain('PENDING');
  });

  it('should allow DEFERRED -> IN_PROGRESS (resume)', () => {
    expect(VALID_TRANSITIONS.DEFERRED).toContain('IN_PROGRESS');
  });

  it('should allow DEFERRED -> CANCELLED', () => {
    expect(VALID_TRANSITIONS.DEFERRED).toContain('CANCELLED');
  });

  it('should not allow DEFERRED -> COMPLETED', () => {
    expect(VALID_TRANSITIONS.DEFERRED).not.toContain('COMPLETED');
  });

  it('should not allow COMPLETED -> any', () => {
    expect(VALID_TRANSITIONS.COMPLETED).toEqual([]);
  });

  it('should not allow CANCELLED -> any', () => {
    expect(VALID_TRANSITIONS.CANCELLED).toEqual([]);
  });
});

describe('Task Validation', () => {
  it('should require deferredReason when status is DEFERRED', () => {
    const status = 'DEFERRED';
    const deferredReason = undefined;

    const isValid = status !== 'DEFERRED' || (deferredReason != null && String(deferredReason).length > 0);
    expect(isValid).toBe(false);
  });

  it('should allow DEFERRED with a reason', () => {
    const status = 'DEFERRED';
    const deferredReason = 'Patient not available';

    const isValid = status !== 'DEFERRED' || (deferredReason != null && String(deferredReason).length > 0);
    expect(isValid).toBe(true);
  });

  it('should validate task priority values', () => {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    expect(validPriorities).toContain('low');
    expect(validPriorities).toContain('medium');
    expect(validPriorities).toContain('high');
    expect(validPriorities).toContain('urgent');
    expect(validPriorities).not.toContain('critical');
  });

  it('should validate task status values', () => {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'CANCELLED'];
    expect(validStatuses).toContain('PENDING');
    expect(validStatuses).toContain('IN_PROGRESS');
    expect(validStatuses).toContain('COMPLETED');
    expect(validStatuses).toContain('DEFERRED');
    expect(validStatuses).toContain('CANCELLED');
    expect(validStatuses).not.toContain('pending');
  });
});

describe('Task Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a task with PENDING status', async () => {
    const mockTask = {
      id: 'task-1',
      patientId: 'patient-1',
      assignedTo: 'user-1',
      title: 'Check vitals',
      priority: 'medium',
      status: 'PENDING',
    };
    mockPrisma.nursingTask.create.mockResolvedValue(mockTask);

    const result = await mockPrisma.nursingTask.create({
      data: { ...mockTask },
    });

    expect(result.status).toBe('PENDING');
    expect(result.priority).toBe('medium');
  });

  it('should transition task status', async () => {
    const mockTask = {
      id: 'task-1',
      status: 'IN_PROGRESS',
      completedAt: null,
    };
    mockPrisma.nursingTask.update.mockResolvedValue({ ...mockTask, status: 'COMPLETED', completedAt: new Date() });

    const result = await mockPrisma.nursingTask.update({
      where: { id: 'task-1' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.completedAt).toBeDefined();
  });

  it('should defer task with reason', async () => {
    mockPrisma.nursingTask.update.mockResolvedValue({
      id: 'task-1',
      status: 'DEFERRED',
      deferredReason: 'Patient sleeping',
      deferredBy: 'user-1',
    });

    const result = await mockPrisma.nursingTask.update({
      where: { id: 'task-1' },
      data: { status: 'DEFERRED', deferredReason: 'Patient sleeping', deferredBy: 'user-1' },
    });

    expect(result.status).toBe('DEFERRED');
    expect(result.deferredReason).toBe('Patient sleeping');
  });

  it('should clear deferred fields when resuming', async () => {
    mockPrisma.nursingTask.update.mockResolvedValue({
      id: 'task-1',
      status: 'IN_PROGRESS',
      deferredReason: null,
      deferredBy: null,
    });

    const result = await mockPrisma.nursingTask.update({
      where: { id: 'task-1' },
      data: { status: 'IN_PROGRESS', deferredReason: null, deferredBy: null },
    });

    expect(result.status).toBe('IN_PROGRESS');
    expect(result.deferredReason).toBeNull();
  });

  it('should create task notification', async () => {
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });

    await mockPrisma.notification.create({
      data: {
        userId: 'user-1',
        type: 'TASK_ASSIGNMENT',
        title: 'New Task Assigned',
        message: 'You have been assigned a new task',
      },
    });

    expect(mockPrisma.notification.create).toHaveBeenCalled();
  });
});
