import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createTaskSchema = z.object({
  patientId: z.string().uuid(),
  assignedTo: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
});

const transitionSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'CANCELLED']),
  deferredReason: z.string().max(2000).optional(),
});

const assignSchema = z.object({
  assignedTo: z.string().uuid(),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'DEFERRED', 'CANCELLED'],
  DEFERRED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

async function createTaskNotification(userId: string, type: string, title: string, message: string): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, message },
  });
}

// GET /tasks - All tasks for current user (nurse sees own, supervisor/admin see all)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, patientId, assignedTo } = req.query;
    const userId = req.user?.id;
    const isAdmin = req.user?.roles.includes('ADMINISTRATOR');
    const isSupervisor = req.user?.roles.includes('SUPERVISOR');

    const where: Record<string, unknown> = {};

    if (!isAdmin && !isSupervisor) {
      where.assignedTo = userId;
    } else {
      if (assignedTo) where.assignedTo = assignedTo as string;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (patientId) where.patientId = patientId;

    const tasks = await prisma.nursingTask.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        deferrer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    const stats = await prisma.nursingTask.groupBy({
      by: ['status'],
      where: isAdmin || isSupervisor ? {} : { assignedTo: userId },
      _count: { status: true },
    });

    res.json({ success: true, data: tasks, stats });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// GET /tasks/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const task = await prisma.nursingTask.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true, ward: { select: { name: true } } } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        deferrer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
      return;
    }

    const validTransitions = VALID_TRANSITIONS[task.status] || [];

    res.json({ success: true, data: { ...task, validTransitions } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// POST /tasks
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const body = createTaskSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
      });
      return;
    }

    const task = await prisma.nursingTask.create({
      data: {
        patientId: body.patientId,
        assignedTo: body.assignedTo || req.user?.id,
        title: body.title,
        description: body.description,
        priority: body.priority || 'medium',
        status: 'PENDING',
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'NURSING_TASK', entityId: task.id },
    });

    if (task.assignedTo && task.assignedTo !== req.user?.id) {
      await createTaskNotification(
        task.assignedTo,
        'TASK_ASSIGNMENT',
        'New Task Assigned',
        `You have been assigned a new task: "${task.title}" for patient ${task.patient.firstName} ${task.patient.lastName}.`,
      );
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// PUT /tasks/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateTaskSchema.parse(req.body);

    const existing = await prisma.nursingTask.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
      return;
    }

    if (existing.assignedTo !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR') && !req.user?.roles.includes('SUPERVISOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only edit tasks assigned to you' },
      });
      return;
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'Cannot edit completed or cancelled tasks' },
      });
      return;
    }

    const task = await prisma.nursingTask.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    res.json({ success: true, data: task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// POST /tasks/:id/transition
router.post('/:id/transition', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = transitionSchema.parse(req.body);

    const existing = await prisma.nursingTask.findUnique({
      where: { id },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
      return;
    }

    if (existing.assignedTo !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR') && !req.user?.roles.includes('SUPERVISOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only transition tasks assigned to you' },
      });
      return;
    }

    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(body.status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${existing.status} to ${body.status}` },
      });
      return;
    }

    if (body.status === 'DEFERRED' && !body.deferredReason) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Deferred reason is required when deferring a task' },
      });
      return;
    }

    const updateData: Record<string, unknown> = { status: body.status };

    if (body.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    if (body.status === 'DEFERRED') {
      updateData.deferredReason = body.deferredReason;
      updateData.deferredBy = req.user?.id;
    }

    if (body.status === 'IN_PROGRESS' && existing.status === 'DEFERRED') {
      updateData.deferredReason = null;
      updateData.deferredBy = null;
    }

    const task = await prisma.nursingTask.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { firstName: true, lastName: true } },
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: `TRANSITION_${body.status}`, entity: 'NURSING_TASK', entityId: id },
    });

    if (body.status === 'COMPLETED' && existing.assignedTo) {
      await createTaskNotification(
        existing.assignedTo,
        'TASK_COMPLETED',
        'Task Completed',
        `Task "${task.title}" for patient ${existing.patient.firstName} ${existing.patient.lastName} has been marked as completed.`,
      );
    }

    if (body.status === 'DEFERRED' && existing.assignedTo) {
      await createTaskNotification(
        existing.assignedTo,
        'TASK_DEFERRED',
        'Task Deferred',
        `Task "${task.title}" for patient ${existing.patient.firstName} ${existing.patient.lastName} has been deferred. Reason: ${body.deferredReason}`,
      );
    }

    res.json({ success: true, data: task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// POST /tasks/:id/assign
router.post('/:id/assign', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = assignSchema.parse(req.body);

    const existing = await prisma.nursingTask.findUnique({
      where: { id },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
      return;
    }

    const assignee = await prisma.user.findUnique({ where: { id: body.assignedTo } });
    if (!assignee) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    const task = await prisma.nursingTask.update({
      where: { id },
      data: { assignedTo: body.assignedTo },
      include: { assignee: { select: { firstName: true, lastName: true } } },
    });

    if (body.assignedTo !== existing.assignedTo) {
      await createTaskNotification(
        body.assignedTo,
        'TASK_ASSIGNMENT',
        'Task Reassigned',
        `Task "${task.title}" for patient ${existing.patient.firstName} ${existing.patient.lastName} has been assigned to you.`,
      );
    }

    res.json({ success: true, data: task });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// POST /tasks/check-due - Trigger check for due/overdue tasks
router.post('/check-due', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await checkDueAndOverdueTasks();
    res.json({ success: true, data: result });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// DELETE /tasks/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = await prisma.nursingTask.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
      return;
    }

    if (existing.assignedTo !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR') && !req.user?.roles.includes('SUPERVISOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete tasks assigned to you' },
      });
      return;
    }

    await prisma.nursingTask.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'NURSING_TASK', entityId: id },
    });

    res.json({ success: true, data: { message: 'Task deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as taskRouter };

// POST /tasks/check-due - Check for due and overdue tasks, create notifications
async function checkDueAndOverdueTasks(): Promise<{ dueCount: number; overdueCount: number }> {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  const dueTasks = await prisma.nursingTask.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { gte: now, lte: oneHourFromNow },
      assignedTo: { not: null },
    },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });

  let dueCount = 0;
  for (const task of dueTasks) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: task.assignedTo!,
        type: 'TASK_DUE',
        message: { contains: task.id },
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: task.assignedTo!,
          type: 'TASK_DUE',
          title: 'Task Due Soon',
          message: `Task "${task.title}" for patient ${task.patient.firstName} ${task.patient.lastName} is due within the next hour.`,
        },
      });
      dueCount++;
    }
  }

  const overdueTasks = await prisma.nursingTask.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { lt: now },
      assignedTo: { not: null },
    },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });

  let overdueCount = 0;
  for (const task of overdueTasks) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: task.assignedTo!,
        type: 'TASK_OVERDUE',
        message: { contains: task.id },
      },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: task.assignedTo!,
          type: 'TASK_OVERDUE',
          title: 'Task Overdue',
          message: `Task "${task.title}" for patient ${task.patient.firstName} ${task.patient.lastName} is overdue.`,
        },
      });
      overdueCount++;
    }
  }

  return { dueCount, overdueCount };
}

export { checkDueAndOverdueTasks };
