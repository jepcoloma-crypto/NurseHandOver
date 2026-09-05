import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createAssignmentSchema = z.object({
  nurseId: z.string().uuid(),
  wardId: z.string().uuid(),
  shiftId: z.string().uuid(),
  assignedDate: z.string().datetime(),
});

const updateAssignmentSchema = z.object({
  wardId: z.string().uuid().optional(),
  shiftId: z.string().uuid().optional(),
  assignedDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const wardId = req.query.wardId as string | undefined;
    const shiftId = req.query.shiftId as string | undefined;
    const nurseId = req.query.nurseId as string | undefined;

    const where: Record<string, unknown> = { isActive: true };
    if (wardId) where.wardId = wardId;
    if (shiftId) where.shiftId = shiftId;
    if (nurseId) where.nurseId = nurseId;

    const assignments = await prisma.nurseAssignment.findMany({
      where,
      include: {
        nurse: { select: { id: true, firstName: true, lastName: true, email: true } },
        ward: { select: { id: true, name: true } },
        shift: true,
      },
      orderBy: { assignedDate: 'desc' },
    });

    res.json({ success: true, data: assignments });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const assignments = await prisma.nurseAssignment.findMany({
      where: { nurseId: req.user?.id, isActive: true },
      include: {
        ward: { select: { id: true, name: true } },
        shift: true,
      },
      orderBy: { assignedDate: 'desc' },
    });

    res.json({ success: true, data: assignments });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createAssignmentSchema.parse(req.body);

    const nurse = await prisma.user.findUnique({ where: { id: body.nurseId } });
    if (!nurse) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Nurse not found' },
      });
      return;
    }

    const ward = await prisma.ward.findUnique({ where: { id: body.wardId } });
    if (!ward) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ward not found' },
      });
      return;
    }

    const shift = await prisma.shift.findUnique({ where: { id: body.shiftId } });
    if (!shift) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Shift not found' },
      });
      return;
    }

    const nurseRoles = await prisma.userRole.findMany({
      where: { userId: body.nurseId },
      include: { role: { select: { name: true } } },
    });
    const isNurse = nurseRoles.some((ur) => ur.role.name === 'NURSE');
    if (!isNurse) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'User must have NURSE role' },
      });
      return;
    }

    const existing = await prisma.nurseAssignment.findFirst({
      where: {
        nurseId: body.nurseId,
        assignedDate: new Date(body.assignedDate),
        isActive: true,
      },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Nurse already has an assignment for this date' },
      });
      return;
    }

    const assignment = await prisma.nurseAssignment.create({
      data: {
        nurseId: body.nurseId,
        wardId: body.wardId,
        shiftId: body.shiftId,
        assignedDate: new Date(body.assignedDate),
      },
      include: {
        nurse: { select: { id: true, firstName: true, lastName: true, email: true } },
        ward: { select: { id: true, name: true } },
        shift: true,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'NURSE_ASSIGNMENT', entityId: assignment.id },
    });

    res.status(201).json({ success: true, data: assignment });
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

router.put('/:id', authenticate, authorize('SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateAssignmentSchema.parse(req.body);

    const assignment = await prisma.nurseAssignment.findUnique({ where: { id } });
    if (!assignment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found' },
      });
      return;
    }

    const updateData: Record<string, unknown> = { ...body };
    if (body.assignedDate) updateData.assignedDate = new Date(body.assignedDate);

    const updated = await prisma.nurseAssignment.update({
      where: { id },
      data: updateData,
      include: {
        nurse: { select: { id: true, firstName: true, lastName: true, email: true } },
        ward: { select: { id: true, name: true } },
        shift: true,
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'NURSE_ASSIGNMENT', entityId: id },
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

router.delete('/:id', authenticate, authorize('SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const assignment = await prisma.nurseAssignment.findUnique({ where: { id } });
    if (!assignment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment not found' },
      });
      return;
    }

    await prisma.nurseAssignment.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'NURSE_ASSIGNMENT', entityId: id },
    });

    res.json({ success: true, data: { message: 'Assignment deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as assignmentRouter };
