import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { authorizePatientAccess } from '../middleware/authorizePatient.js';

const router = Router();

const createPatientSchema = z.object({
  mrn: z.string().max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().datetime(),
  gender: z.string().max(20),
  admissionDate: z.string().datetime(),
  wardId: z.string().uuid(),
  bedId: z.string().uuid().optional(),
});

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.id;

    let whereClause: Record<string, unknown> = { isActive: true };

    if (userRoles.includes('NURSE') && !userRoles.includes('SUPERVISOR') && !userRoles.includes('ADMINISTRATOR')) {
      whereClause = {
        ...whereClause,
        OR: [
          {
            ward: {
              nurseAssignments: {
                some: {
                  nurseId: userId,
                  isActive: true,
                },
              },
            },
          },
          {
            handovers: {
              some: {
                OR: [
                  { outgoingNurseId: userId },
                  { incomingNurseId: userId },
                ],
              },
            },
          },
        ],
      };
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        ward: {
          select: {
            id: true,
            name: true,
          },
        },
        bed: {
          select: {
            id: true,
            number: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: patients,
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

router.get('/:id', authenticate, authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
          },
        },
        bed: {
          select: {
            id: true,
            number: true,
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createPatientSchema.parse(req.body);

    const patient = await prisma.patient.create({
      data: {
        mrn: body.mrn,
        firstName: body.firstName,
        lastName: body.lastName,
        dateOfBirth: new Date(body.dateOfBirth),
        gender: body.gender,
        admissionDate: new Date(body.admissionDate),
        wardId: body.wardId,
        bedId: body.bedId,
      },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
          },
        },
        bed: {
          select: {
            id: true,
            number: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'PATIENT',
        entityId: patient.id,
      },
    });

    res.status(201).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.issues,
        },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

export { router as patientRouter };
