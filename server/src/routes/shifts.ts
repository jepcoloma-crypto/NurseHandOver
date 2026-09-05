import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createShiftSchema = z.object({
  name: z.string().min(1).max(50),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

const updateShiftSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { isActive: true },
      include: { _count: { select: { nurseAssignments: true } } },
      orderBy: { startTime: 'asc' },
    });

    res.json({
      success: true,
      data: shifts.map((s) => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
        nurseCount: s._count.nurseAssignments,
        createdAt: s.createdAt,
      })),
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        nurseAssignments: {
          where: { isActive: true },
          include: {
            nurse: { select: { id: true, firstName: true, lastName: true, email: true } },
            ward: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!shift) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Shift not found' },
      });
      return;
    }

    res.json({ success: true, data: shift });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createShiftSchema.parse(req.body);

    const shift = await prisma.shift.create({
      data: {
        name: body.name,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'SHIFT', entityId: shift.id },
    });

    res.status(201).json({ success: true, data: shift });
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

router.put('/:id', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateShiftSchema.parse(req.body);

    const shift = await prisma.shift.findUnique({ where: { id } });
    if (!shift) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Shift not found' },
      });
      return;
    }

    const updateData: Record<string, unknown> = { ...body };
    if (body.startTime) updateData.startTime = new Date(body.startTime);
    if (body.endTime) updateData.endTime = new Date(body.endTime);

    const updated = await prisma.shift.update({ where: { id }, data: updateData });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'SHIFT', entityId: id },
    });

    res.json({ success: true, data: updated });
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

router.delete('/:id', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { _count: { select: { nurseAssignments: { where: { isActive: true } } } } },
    });

    if (!shift) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Shift not found' },
      });
      return;
    }

    if (shift._count.nurseAssignments > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Cannot delete shift with active assignments' },
      });
      return;
    }

    await prisma.shift.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'SHIFT', entityId: id },
    });

    res.json({ success: true, data: { message: 'Shift deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.get('/my', authenticate, authorize('NURSE', 'SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignments = await prisma.nurseAssignment.findMany({
      where: {
        nurseId: req.user?.id,
        isActive: true,
        assignedDate: { gte: today },
      },
      include: {
        shift: true,
        ward: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'asc' },
    });

    res.json({ success: true, data: assignments });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as shiftRouter };
