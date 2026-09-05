import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createRoomSchema = z.object({
  number: z.string().min(1).max(20),
  wardId: z.string().uuid(),
});

const updateRoomSchema = z.object({
  number: z.string().min(1).max(20).optional(),
  wardId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const wardId = req.query.wardId as string | undefined;
    const where: Record<string, unknown> = { isActive: true };
    if (wardId) where.wardId = wardId;

    const rooms = await prisma.room.findMany({
      where,
      include: {
        ward: { select: { id: true, name: true } },
        _count: { select: { beds: true } },
      },
      orderBy: { number: 'asc' },
    });

    res.json({
      success: true,
      data: rooms.map((r) => ({
        id: r.id,
        number: r.number,
        wardId: r.wardId,
        ward: r.ward,
        isActive: r.isActive,
        bedCount: r._count.beds,
        createdAt: r.createdAt,
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
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        ward: { select: { id: true, name: true } },
        beds: { where: { isActive: true }, orderBy: { number: 'asc' } },
      },
    });

    if (!room) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Room not found' },
      });
      return;
    }

    res.json({ success: true, data: room });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createRoomSchema.parse(req.body);

    const ward = await prisma.ward.findUnique({ where: { id: body.wardId } });
    if (!ward) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ward not found' },
      });
      return;
    }

    const existing = await prisma.room.findFirst({
      where: { number: body.number, wardId: body.wardId },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Room number already exists in this ward' },
      });
      return;
    }

    const room = await prisma.room.create({ data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'ROOM', entityId: room.id },
    });

    res.status(201).json({ success: true, data: room });
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

router.put('/:id', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateRoomSchema.parse(req.body);

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Room not found' },
      });
      return;
    }

    if (body.number && body.wardId) {
      const existing = await prisma.room.findFirst({
        where: { number: body.number, wardId: body.wardId, id: { not: id } },
      });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'Room number already exists in this ward' },
        });
        return;
      }
    }

    const updated = await prisma.room.update({ where: { id }, data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'ROOM', entityId: id },
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

    const room = await prisma.room.findUnique({
      where: { id },
      include: { _count: { select: { beds: { where: { isActive: true } } } } },
    });

    if (!room) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Room not found' },
      });
      return;
    }

    if (room._count.beds > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Cannot delete room with active beds' },
      });
      return;
    }

    await prisma.room.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'ROOM', entityId: id },
    });

    res.json({ success: true, data: { message: 'Room deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as roomRouter };
