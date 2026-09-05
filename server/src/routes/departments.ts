import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createDepartmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { wards: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: departments.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        isActive: d.isActive,
        wardCount: d._count.wards,
        createdAt: d.createdAt,
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
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        wards: {
          where: { isActive: true },
          select: { id: true, name: true, capacity: true },
        },
      },
    });

    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Department not found' },
      });
      return;
    }

    res.json({ success: true, data: department });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createDepartmentSchema.parse(req.body);

    const existing = await prisma.department.findFirst({ where: { name: body.name } });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Department name already exists' },
      });
      return;
    }

    const department = await prisma.department.create({
      data: { name: body.name, description: body.description },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'DEPARTMENT', entityId: department.id },
    });

    res.status(201).json({ success: true, data: department });
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
    const body = updateDepartmentSchema.parse(req.body);

    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Department not found' },
      });
      return;
    }

    if (body.name && body.name !== department.name) {
      const existing = await prisma.department.findFirst({ where: { name: body.name } });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'Department name already exists' },
        });
        return;
      }
    }

    const updated = await prisma.department.update({ where: { id }, data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'DEPARTMENT', entityId: id },
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

    const department = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { wards: { where: { isActive: true } } } } },
    });

    if (!department) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Department not found' },
      });
      return;
    }

    if (department._count.wards > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Cannot delete department with active wards' },
      });
      return;
    }

    await prisma.department.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'DEPARTMENT', entityId: id },
    });

    res.json({ success: true, data: { message: 'Department deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as departmentRouter };
