import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createBedSchema = z.object({
  number: z.string().min(1).max(20),
  roomId: z.string().uuid(),
});

const updateBedSchema = z.object({
  number: z.string().min(1).max(20).optional(),
  roomId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const roomId = req.query.roomId as string | undefined;
    const where: Record<string, unknown> = { isActive: true };
    if (roomId) where.roomId = roomId;

    const beds = await prisma.bed.findMany({
      where,
      include: {
        room: {
          select: { id: true, number: true, ward: { select: { id: true, name: true } } },
        },
        _count: { select: { patients: true } },
      },
      orderBy: { number: 'asc' },
    });

    res.json({
      success: true,
      data: beds.map((b) => ({
        id: b.id,
        number: b.number,
        roomId: b.roomId,
        room: b.room,
        isActive: b.isActive,
        patientCount: b._count.patients,
        createdAt: b.createdAt,
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
    const bed = await prisma.bed.findUnique({
      where: { id },
      include: {
        room: { select: { id: true, number: true, ward: { select: { id: true, name: true } } } },
        patients: { where: { isActive: true }, select: { id: true, mrn: true, firstName: true, lastName: true } },
      },
    });

    if (!bed) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bed not found' },
      });
      return;
    }

    res.json({ success: true, data: bed });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createBedSchema.parse(req.body);

    const room = await prisma.room.findUnique({ where: { id: body.roomId } });
    if (!room) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Room not found' },
      });
      return;
    }

    const existing = await prisma.bed.findFirst({
      where: { number: body.number, roomId: body.roomId },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Bed number already exists in this room' },
      });
      return;
    }

    const bed = await prisma.bed.create({ data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'BED', entityId: bed.id },
    });

    res.status(201).json({ success: true, data: bed });
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
    const body = updateBedSchema.parse(req.body);

    const bed = await prisma.bed.findUnique({ where: { id } });
    if (!bed) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bed not found' },
      });
      return;
    }

    if (body.number && body.roomId) {
      const existing = await prisma.bed.findFirst({
        where: { number: body.number, roomId: body.roomId, id: { not: id } },
      });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: 'Bed number already exists in this room' },
        });
        return;
      }
    }

    const updated = await prisma.bed.update({ where: { id }, data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'BED', entityId: id },
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

    const bed = await prisma.bed.findUnique({
      where: { id },
      include: { _count: { select: { patients: { where: { isActive: true } } } } },
    });

    if (!bed) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bed not found' },
      });
      return;
    }

    if (bed._count.patients > 0) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Cannot delete bed with active patients' },
      });
      return;
    }

    await prisma.bed.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'BED', entityId: id },
    });

    res.json({ success: true, data: { message: 'Bed deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as bedRouter };
