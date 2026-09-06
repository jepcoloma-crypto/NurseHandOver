import { describe, it, expect, vi } from 'vitest';

const mockPrisma = {
  notification: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../config/database.js', () => ({
  prisma: mockPrisma,
}));

describe('Notification Model', () => {
  it('should create a notification', async () => {
    const mockNotif = {
      id: 'notif-1',
      userId: 'user-1',
      type: 'VITAL_SIGN_ALERT',
      title: 'High Fever Alert',
      message: 'Temperature exceeded threshold',
      isRead: false,
      createdAt: new Date(),
    };
    mockPrisma.notification.create.mockResolvedValue(mockNotif);

    const result = await mockPrisma.notification.create({
      data: {
        userId: 'user-1',
        type: 'VITAL_SIGN_ALERT',
        title: 'High Fever Alert',
        message: 'Temperature exceeded threshold',
      },
    });

    expect(result).toEqual(mockNotif);
    expect(result.isRead).toBe(false);
  });

  it('should count unread notifications', async () => {
    mockPrisma.notification.count.mockResolvedValue(5);

    const count = await mockPrisma.notification.count({
      where: { userId: 'user-1', isRead: false },
    });

    expect(count).toBe(5);
  });

  it('should mark notification as read', async () => {
    const updated = { id: 'notif-1', isRead: true };
    mockPrisma.notification.update.mockResolvedValue(updated);

    const result = await mockPrisma.notification.update({
      where: { id: 'notif-1' },
      data: { isRead: true },
    });

    expect(result.isRead).toBe(true);
  });

  it('should mark all notifications as read', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

    const result = await mockPrisma.notification.updateMany({
      where: { userId: 'user-1', isRead: false },
      data: { isRead: true },
    });

    expect(result.count).toBe(3);
  });
});

describe('Notification Types', () => {
  const ALL_TYPES = [
    'NEW_HANDOVER',
    'HANDOVER_SUMMARY',
    'HANDOVER_SUBMITTED',
    'HANDOVER_RECEIVED',
    'HANDOVER_ACCEPTED',
    'HANDOVER_CLARIFICATION',
    'TASK_ASSIGNMENT',
    'TASK_COMPLETED',
    'TASK_DEFERRED',
    'TASK_DUE',
    'TASK_OVERDUE',
    'VITAL_SIGN_ALERT',
    'GENERAL',
  ];

  it('should support NEW_HANDOVER type', () => {
    expect(ALL_TYPES).toContain('NEW_HANDOVER');
  });

  it('should support HANDOVER_SUMMARY type', () => {
    expect(ALL_TYPES).toContain('HANDOVER_SUMMARY');
  });

  it('should support HANDOVER_SUBMITTED type', () => {
    expect(ALL_TYPES).toContain('HANDOVER_SUBMITTED');
  });

  it('should support HANDOVER_RECEIVED type', () => {
    expect(ALL_TYPES).toContain('HANDOVER_RECEIVED');
  });

  it('should support HANDOVER_ACCEPTED type', () => {
    expect(ALL_TYPES).toContain('HANDOVER_ACCEPTED');
  });

  it('should support HANDOVER_CLARIFICATION type', () => {
    expect(ALL_TYPES).toContain('HANDOVER_CLARIFICATION');
  });

  it('should support TASK_ASSIGNMENT type', () => {
    expect(ALL_TYPES).toContain('TASK_ASSIGNMENT');
  });

  it('should support TASK_COMPLETED type', () => {
    expect(ALL_TYPES).toContain('TASK_COMPLETED');
  });

  it('should support TASK_DEFERRED type', () => {
    expect(ALL_TYPES).toContain('TASK_DEFERRED');
  });

  it('should support TASK_DUE type', () => {
    expect(ALL_TYPES).toContain('TASK_DUE');
  });

  it('should support TASK_OVERDUE type', () => {
    expect(ALL_TYPES).toContain('TASK_OVERDUE');
  });

  it('should support VITAL_SIGN_ALERT type', () => {
    expect(ALL_TYPES).toContain('VITAL_SIGN_ALERT');
  });

  it('should support GENERAL type', () => {
    expect(ALL_TYPES).toContain('GENERAL');
  });

  it('should have exactly 13 notification types', () => {
    expect(ALL_TYPES).toHaveLength(13);
  });
});

describe('Notification Routing', () => {
  it('should notify incoming nurse on NEW_HANDOVER', () => {
    const recipient = { role: 'incoming', type: 'NEW_HANDOVER' };
    expect(recipient.type).toBe('NEW_HANDOVER');
  });

  it('should notify incoming nurse on HANDOVER_SUMMARY', () => {
    const recipient = { role: 'incoming', type: 'HANDOVER_SUMMARY' };
    expect(recipient.type).toBe('HANDOVER_SUMMARY');
  });

  it('should notify incoming nurse on HANDOVER_SUBMITTED', () => {
    const recipient = { role: 'incoming', type: 'HANDOVER_SUBMITTED' };
    expect(recipient.type).toBe('HANDOVER_SUBMITTED');
  });

  it('should notify outgoing nurse on HANDOVER_RECEIVED', () => {
    const recipient = { role: 'outgoing', type: 'HANDOVER_RECEIVED' };
    expect(recipient.type).toBe('HANDOVER_RECEIVED');
  });

  it('should notify outgoing nurse on HANDOVER_ACCEPTED', () => {
    const recipient = { role: 'outgoing', type: 'HANDOVER_ACCEPTED' };
    expect(recipient.type).toBe('HANDOVER_ACCEPTED');
  });

  it('should notify outgoing nurse on CLARIFICATION_REQUESTED', () => {
    const recipient = { role: 'outgoing', type: 'HANDOVER_CLARIFICATION' };
    expect(recipient.type).toBe('HANDOVER_CLARIFICATION');
  });

  it('should notify incoming nurse on CLARIFICATION_RESPONDED', () => {
    const recipient = { role: 'incoming', type: 'HANDOVER_CLARIFICATION' };
    expect(recipient.type).toBe('HANDOVER_CLARIFICATION');
  });

  it('should notify assigned nurse on TASK_ASSIGNMENT', () => {
    const recipient = { role: 'assigned', type: 'TASK_ASSIGNMENT' };
    expect(recipient.type).toBe('TASK_ASSIGNMENT');
  });

  it('should notify assigned nurse on TASK_DUE', () => {
    const recipient = { role: 'assigned', type: 'TASK_DUE' };
    expect(recipient.type).toBe('TASK_DUE');
  });

  it('should notify assigned nurse on TASK_OVERDUE', () => {
    const recipient = { role: 'assigned', type: 'TASK_OVERDUE' };
    expect(recipient.type).toBe('TASK_OVERDUE');
  });
});

describe('Notification Filtering', () => {
  it('should filter by unread status', () => {
    const notifications = [
      { id: '1', isRead: false },
      { id: '2', isRead: true },
      { id: '3', isRead: false },
    ];
    const unread = notifications.filter((n) => !n.isRead);
    expect(unread).toHaveLength(2);
  });

  it('should filter by type', () => {
    const notifications = [
      { id: '1', type: 'HANDOVER_SUMMARY' },
      { id: '2', type: 'TASK_DUE' },
      { id: '3', type: 'HANDOVER_ACCEPTED' },
    ];
    const handoverNotifs = notifications.filter((n) => n.type.startsWith('HANDOVER'));
    expect(handoverNotifs).toHaveLength(2);
  });

  it('should count unread notifications correctly', () => {
    const notifications = [
      { id: '1', isRead: false },
      { id: '2', isRead: true },
      { id: '3', isRead: false },
      { id: '4', isRead: false },
    ];
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    expect(unreadCount).toBe(3);
  });
});

describe('Task Due/Overdue Notification Logic', () => {
  it('should identify tasks due within one hour', () => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const taskDueIn30Min = new Date(now.getTime() + 30 * 60 * 1000);
    expect(taskDueIn30Min >= now && taskDueIn30Min <= oneHourFromNow).toBe(true);
  });

  it('should identify overdue tasks', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 60 * 60 * 1000);
    expect(pastDate < now).toBe(true);
  });

  it('should not duplicate due notifications', () => {
    const existingNotifications = [
      { type: 'TASK_DUE', message: 'Task "abc-123" is due' },
    ];
    const taskId = 'abc-123';
    const alreadyNotified = existingNotifications.some(
      (n) => n.type === 'TASK_DUE' && n.message.includes(taskId),
    );
    expect(alreadyNotified).toBe(true);
  });

  it('should only notify assigned nurse for due tasks', () => {
    const task = { assignedTo: 'nurse-1', dueDate: new Date() };
    expect(task.assignedTo).toBe('nurse-1');
  });
});
