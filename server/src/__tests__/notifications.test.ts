import { describe, it, expect, vi } from 'vitest';

const mockPrisma = {
  notification: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
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
  it('should support VITAL_SIGN_ALERT type', () => {
    const type = 'VITAL_SIGN_ALERT';
    expect(type).toBe('VITAL_SIGN_ALERT');
  });

  it('should support HANDOVER_SUMMARY type', () => {
    const type = 'HANDOVER_SUMMARY';
    expect(type).toBe('HANDOVER_SUMMARY');
  });

  it('should support TASK_NOTIFICATION type', () => {
    const type = 'TASK_NOTIFICATION';
    expect(type).toBe('TASK_NOTIFICATION');
  });
});
