import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createWardSchema = z.object({
  name: z.string().min(1).max(100),
  departmentId: z.string().uuid(),
  capacity: z.number().int().min(0).default(0),
});

const updateWardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  departmentId: z.string().uuid().optional(),
  capacity: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.id;

    const where: Record<string, unknown> = { isActive: true };

    if (userRoles.includes('NURSE') && !userRoles.includes('SUPERVISOR') && !userRoles.includes('ADMINISTRATOR')) {
      where.nurseAssignments = { some: { nurseId: userId, isActive: true } };
    }

    const wards = await prisma.ward.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { rooms: true, patients: true, nurseAssignments: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: wards.map((w) => ({
        id: w.id,
        name: w.name,
        departmentId: w.departmentId,
        department: w.department,
        capacity: w.capacity,
        isActive: w.isActive,
        roomCount: w._count.rooms,
        patientCount: w._count.patients,
        nurseCount: w._count.nurseAssignments,
        createdAt: w.createdAt,
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
    const ward = await prisma.ward.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        rooms: {
          where: { isActive: true },
          include: {
            beds: { select: { id: true, number: true, isActive: true } },
          },
        },
      },
    });

    if (!ward) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ward not found' },
      });
      return;
    }

    res.json({ success: true, data: ward });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createWardSchema.parse(req.body);

    const department = await prisma.department.findUnique({ where: { id: body.departmentId } });
    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Department not found' },
      });
      return;
    }

    const existing = await prisma.ward.findFirst({
      where: { name: body.name, departmentId: body.departmentId },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Ward name already exists in this department' },
      });
      return;
    }

    const ward = await prisma.ward.create({ data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'WARD', entityId: ward.id },
    });

    res.status(201).json({ success: true, data: ward });
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
    const body = updateWardSchema.parse(req.body);

    const ward = await prisma.ward.findUnique({ where: { id } });
    if (!ward) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ward not found' },
      });
      return;
    }

    if (body.name && body.departmentId) {
      const existing = await prisma.ward.findFirst({
        where: { name: body.name, departmentId: body.departmentId, id: { not: id } },
      });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'Ward name already exists in this department' },
        });
        return;
      }
    }

    const updated = await prisma.ward.update({ where: { id }, data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'WARD', entityId: id },
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

    const ward = await prisma.ward.findUnique({
      where: { id },
      include: { _count: { select: { rooms: { where: { isActive: true } }, patients: { where: { isActive: true } } } } },
    });

    if (!ward) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ward not found' },
      });
      return;
    }

    if (ward._count.patients > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Cannot delete ward with active patients' },
      });
      return;
    }

    await prisma.ward.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'WARD', entityId: id },
    });

    res.json({ success: true, data: { message: 'Ward deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as wardRouter };
