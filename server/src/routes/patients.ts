import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { authorizePatientAccess } from '../middleware/authorizePatient.js';

const router = Router();

const createPatientSchema = z.object({
  mrn: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().datetime(),
  gender: z.string().min(1).max(20),
  admissionDate: z.string().datetime(),
  wardId: z.string().uuid(),
  bedId: z.string().uuid().optional(),
});

const updatePatientSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  gender: z.string().min(1).max(20).optional(),
  wardId: z.string().uuid().optional(),
  bedId: z.string().uuid().optional().nullable(),
  status: z.string().max(20).optional(),
});

const createVitalSignSchema = z.object({
  temperature: z.number().min(30).max(45).optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  respiratoryRate: z.number().int().min(4).max(80).optional(),
  bloodPressureSystolic: z.number().int().min(40).max(300).optional(),
  bloodPressureDiastolic: z.number().int().min(20).max(200).optional(),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  painScale: z.number().int().min(0).max(10).optional(),
  bloodGlucose: z.number().min(0).max(1000).optional(),
  notes: z.string().max(1000).optional(),
});

const createAssessmentSchema = z.object({
  assessmentType: z.enum([
    'General', 'Pain', 'Neurological', 'Cardiovascular',
    'Respiratory', 'Gastrointestinal', 'Integumentary',
    'Musculoskeletal', 'Elimination', 'Cultural/Spiritual',
    'Activity/Rest', 'Coping/Stress', 'Safety',
  ]),
  findings: z.string().min(1).max(2000),
  painScale: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(1000).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
});

function buildNurseWhereClause(userId: string): Record<string, unknown> {
  return {
    OR: [
      {
        ward: {
          nurseAssignments: {
            some: { nurseId: userId, isActive: true },
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

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.id;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const wardId = (req.query.wardId as string) || '';
    const status = (req.query.status as string) || '';

    const where: Record<string, unknown> = { isActive: true };

    if (userRoles.includes('NURSE') && !userRoles.includes('SUPERVISOR') && !userRoles.includes('ADMINISTRATOR')) {
      where.AND = [buildNurseWhereClause(userId!)];
    }

    if (search) {
      const searchCondition = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { mrn: { contains: search, mode: 'insensitive' } },
        ],
      };
      if (where.AND) {
        (where.AND as unknown[]).push(searchCondition);
      } else {
        where.AND = [searchCondition];
      }
    }

    if (wardId) where.wardId = wardId;
    if (status) where.status = status;

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: {
          ward: { select: { id: true, name: true } },
          bed: { select: { id: true, number: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.get('/:id', authenticate, authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        ward: { select: { id: true, name: true } },
        bed: { select: { id: true, number: true } },
        vitalSigns: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
        nursingAssessments: {
          orderBy: { assessedAt: 'desc' },
          take: 5,
        },
        nursingTasks: {
          where: { status: { not: 'completed' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        handovers: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            createdAt: true,
            submittedAt: true,
            outgoingNurse: { select: { firstName: true, lastName: true } },
            incomingNurse: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
      });
      return;
    }

    res.json({ success: true, data: patient });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.get('/:id/timeline', authenticate, authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const [vitalSigns, assessments, tasks, handovers] = await Promise.all([
      prisma.vitalSign.findMany({
        where: { patientId },
        orderBy: { recordedAt: 'desc' },
        take: limit,
      }),
      prisma.nursingAssessment.findMany({
        where: { patientId },
        orderBy: { assessedAt: 'desc' },
        take: limit,
      }),
      prisma.nursingTask.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.handover.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          status: true,
          createdAt: true,
          submittedAt: true,
          receivedAt: true,
          acceptedAt: true,
          outgoingNurse: { select: { firstName: true, lastName: true } },
          incomingNurse: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const events = [
      ...vitalSigns.map((v) => ({ type: 'VITAL_SIGN' as const, date: v.recordedAt, data: v })),
      ...assessments.map((a) => ({ type: 'ASSESSMENT' as const, date: a.assessedAt, data: a })),
      ...tasks.map((t) => ({ type: 'TASK' as const, date: t.createdAt, data: t })),
      ...handovers.map((h) => ({ type: 'HANDOVER' as const, date: h.createdAt, data: h })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);

    res.json({ success: true, data: events });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createPatientSchema.parse(req.body);

    const ward = await prisma.ward.findUnique({ where: { id: body.wardId } });
    if (!ward) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ward not found' },
      });
      return;
    }

    if (body.bedId) {
      const bed = await prisma.bed.findUnique({ where: { id: body.bedId } });
      if (!bed) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Bed not found' },
        });
        return;
      }
    }

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
        ward: { select: { id: true, name: true } },
        bed: { select: { id: true, number: true } },
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'PATIENT', entityId: patient.id },
    });

    res.status(201).json({ success: true, data: patient });
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
    const body = updatePatientSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
      });
      return;
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: body,
      include: {
        ward: { select: { id: true, name: true } },
        bed: { select: { id: true, number: true } },
      },
    });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'PATIENT', entityId: id },
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

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
      });
      return;
    }

    await prisma.patient.update({ where: { id }, data: { isActive: false } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'PATIENT', entityId: id },
    });

    res.json({ success: true, data: { message: 'Patient deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.get('/:id/vitals', authenticate, authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const vitals = await prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: vitals });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/:id/vitals', authenticate, authorize('NURSE', 'SUPERVISOR', 'ADMINISTRATOR'), authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = createVitalSignSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
      });
      return;
    }

    const vitalSign = await prisma.vitalSign.create({
      data: {
        patientId,
        recordedBy: req.user?.id ?? '',
        temperature: body.temperature,
        heartRate: body.heartRate,
        respiratoryRate: body.respiratoryRate,
        bloodPressureSystolic: body.bloodPressureSystolic,
        bloodPressureDiastolic: body.bloodPressureDiastolic,
        oxygenSaturation: body.oxygenSaturation,
        painScale: body.painScale,
        bloodGlucose: body.bloodGlucose,
        notes: body.notes,
      },
    });

    const vitalsToCheck: Record<string, number | undefined> = {
      temperature: body.temperature,
      heartRate: body.heartRate,
      respiratoryRate: body.respiratoryRate,
      bloodPressureSystolic: body.bloodPressureSystolic,
      bloodPressureDiastolic: body.bloodPressureDiastolic,
      oxygenSaturation: body.oxygenSaturation,
      painScale: body.painScale,
      bloodGlucose: body.bloodGlucose,
    };

    const rules = (globalThis as Record<string, unknown>).__alertRules as
      | { id: string; name: string; parameter: string; operator: string; threshold: { toNumber: () => number }; severity: string }[]
      | undefined;

    if (rules) {
      const paramToValue: Record<string, number> = {};
      for (const [key, val] of Object.entries(vitalsToCheck)) {
        if (val !== undefined) paramToValue[key] = val;
      }

      const operatorMap: Record<string, (val: number, threshold: number) => boolean> = {
        gt: (v, t) => v > t,
        gte: (v, t) => v >= t,
        lt: (v, t) => v < t,
        lte: (v, t) => v <= t,
        eq: (v, t) => v === t,
      };

      for (const rule of rules) {
        const val = paramToValue[rule.parameter];
        if (val !== undefined) {
          const compare = operatorMap[rule.operator];
          if (compare && compare(val, rule.threshold.toNumber())) {
            const severityLabel = rule.severity === 'critical' ? 'CRITICAL' : rule.severity === 'warning' ? 'ALERT' : 'NOTICE';
            await prisma.notification.create({
              data: {
                userId: req.user?.id ?? '',
                type: 'VITAL_SIGN_ALERT',
                title: `[${severityLabel}] ${rule.name}`,
                message: `Configured alert: ${rule.parameter} value ${val} triggered "${rule.name}" (threshold: ${rule.operator} ${rule.threshold.toNumber()}). This is an automated alert based on recorded information, not a diagnosis.`,
              },
            });
          }
        }
      }
    }

    res.status(201).json({ success: true, data: vitalSign });
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

router.get('/:id/assessments', authenticate, authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const assessments = await prisma.nursingAssessment.findMany({
      where: { patientId },
      orderBy: { assessedAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: assessments });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/:id/assessments', authenticate, authorize('NURSE', 'SUPERVISOR', 'ADMINISTRATOR'), authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = createAssessmentSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
      });
      return;
    }

    const assessment = await prisma.nursingAssessment.create({
      data: {
        patientId,
        assessedBy: req.user?.id ?? '',
        assessmentType: body.assessmentType,
        findings: body.findings,
        painScale: body.painScale,
        notes: body.notes,
      },
    });

    res.status(201).json({ success: true, data: assessment });
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

router.get('/:id/tasks', authenticate, authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const tasks = await prisma.nursingTask.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: tasks });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/:id/tasks', authenticate, authorize('NURSE', 'SUPERVISOR', 'ADMINISTRATOR'), authorizePatientAccess, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = createTaskSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
      });
      return;
    }

    const task = await prisma.nursingTask.create({
      data: {
        patientId,
        assignedTo: req.user?.id ?? '',
        title: body.title,
        description: body.description,
        priority: body.priority || 'medium',
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

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

router.put('/:patientId/tasks/:taskId', authenticate, authorize('NURSE', 'SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const taskId = Array.isArray(req.params.taskId) ? req.params.taskId[0] : req.params.taskId;

    const task = await prisma.nursingTask.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
      return;
    }

    const status = req.body.status as string | undefined;
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'completed') updateData.completedAt = new Date();
    }

    const updated = await prisma.nursingTask.update({ where: { id: taskId }, data: updateData });

    res.json({ success: true, data: updated });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as patientRouter };
