import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';

const router = Router();

import { computeCompleteness, validateHandoverForSubmission } from '../lib/completeness.js';
import type { SectionData } from '../lib/completeness.js';

const createHandoverSchema = z.object({
  patientId: z.string().uuid(),
  shiftId: z.string().uuid(),
  incomingNurseId: z.string().uuid().optional(),
  sections: z.object({
    SITUATION: z.string().min(1).max(5000).optional(),
    BACKGROUND: z.string().min(1).max(5000).optional(),
    ASSESSMENT: z.string().min(1).max(5000).optional(),
    RECOMMENDATION: z.string().min(1).max(5000).optional(),
  }).optional(),
});

const updateSectionsSchema = z.object({
  sections: z.object({
    SITUATION: z.string().max(5000).optional(),
    BACKGROUND: z.string().max(5000).optional(),
    ASSESSMENT: z.string().max(5000).optional(),
    RECOMMENDATION: z.string().max(5000).optional(),
  }),
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['READY_FOR_REVIEW'],
  READY_FOR_REVIEW: ['DRAFT', 'SUBMITTED'],
  SUBMITTED: ['RECEIVED'],
  RECEIVED: ['CLARIFICATION_REQUIRED', 'ACCEPTED'],
  CLARIFICATION_REQUIRED: ['CLARIFICATION_RESPONDED'],
  CLARIFICATION_RESPONDED: ['ACCEPTED', 'CLARIFICATION_REQUIRED'],
  ACCEPTED: ['REOPENED'],
  REOPENED: ['ACCEPTED'],
  CANCELLED: [],
};

async function createHandoverEvent(handoverId: string, eventType: string, userId: string, details?: Record<string, unknown>): Promise<void> {
  await prisma.handoverEvent.create({
    data: {
      handoverId,
      eventType,
      userId,
      details: details ? JSON.parse(JSON.stringify(details)) : undefined,
    },
  });
}

async function createHandoverSnapshot(handoverId: string, createdBy: string): Promise<void> {
  const handover = await prisma.handover.findUnique({
    where: { id: handoverId },
    include: { sections: true },
  });
  if (!handover) return;

  const lastVersion = await prisma.handoverVersion.findFirst({
    where: { handoverId },
    orderBy: { version: 'desc' },
  });

  const snapshot = JSON.parse(JSON.stringify(handover));

  await prisma.handoverVersion.create({
    data: {
      handoverId,
      version: (lastVersion?.version || 0) + 1,
      snapshot,
      createdBy,
    },
  });
}

// GET /handovers - List handovers
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.roles.includes('ADMINISTRATOR');
    const { status, patientId, view } = req.query;

    const where: Record<string, unknown> = {};

    if (view === 'mine') {
      where.OR = [
        { outgoingNurseId: userId },
        { incomingNurseId: userId },
      ];
    } else if (!isAdmin) {
      where.OR = [
        { outgoingNurseId: userId },
        { incomingNurseId: userId },
      ];
    }

    if (status) where.status = status;
    if (patientId) where.patientId = patientId;

    const handovers = await prisma.handover.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        outgoingNurse: { select: { id: true, firstName: true, lastName: true } },
        incomingNurse: { select: { id: true, firstName: true, lastName: true } },
        shift: { select: { id: true, name: true } },
        sections: { select: { sectionType: true, content: true, isComplete: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: handovers });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// GET /handovers/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const handover = await prisma.handover.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true, firstName: true, lastName: true, mrn: true, gender: true,
            ward: { select: { id: true, name: true } },
            bed: { select: { id: true, number: true } },
          },
        },
        outgoingNurse: { select: { id: true, firstName: true, lastName: true, email: true } },
        incomingNurse: { select: { id: true, firstName: true, lastName: true, email: true } },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        sections: true,
        versions: { orderBy: { version: 'desc' }, take: 5 },
        events: { orderBy: { createdAt: 'desc' }, take: 20 },
        clarifications: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!handover) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    const versionsWithUsers = await Promise.all(
      handover.versions.map(async (v) => {
        const user = await prisma.user.findUnique({
          where: { id: v.createdBy },
          select: { firstName: true, lastName: true },
        });
        return { ...v, createdByUser: user };
      }),
    );

    const eventsWithUsers = await Promise.all(
      handover.events.map(async (e) => {
        const user = await prisma.user.findUnique({
          where: { id: e.userId },
          select: { firstName: true, lastName: true },
        });
        return { ...e, user };
      }),
    );

    const validTransitions = VALID_TRANSITIONS[handover.status] || [];
    const completeness = computeCompleteness(handover.sections as SectionData[]);

    await createHandoverEvent(id, 'VIEWED', req.user?.id ?? '');

    res.json({
      success: true,
      data: {
        ...handover,
        versions: versionsWithUsers,
        events: eventsWithUsers,
        validTransitions,
        completeness: completeness.percentage,
        completenessDetails: completeness,
      },
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// POST /handovers - Create handover
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const body = createHandoverSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Patient not found' },
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

    const handover = await prisma.handover.create({
      data: {
        patientId: body.patientId,
        outgoingNurseId: req.user?.id ?? '',
        incomingNurseId: body.incomingNurseId,
        shiftId: body.shiftId,
        status: 'DRAFT',
      },
    });

    if (body.sections) {
      for (const [type, content] of Object.entries(body.sections)) {
        if (content && content.trim().length > 0) {
          await prisma.handoverSection.create({
            data: {
              handoverId: handover.id,
              sectionType: type,
              content,
              isComplete: true,
            },
          });
        }
      }
    }

    await createHandoverEvent(handover.id, 'CREATED', req.user?.id ?? '');
    await createHandoverSnapshot(handover.id, req.user?.id ?? '');

    const created = await prisma.handover.findUnique({
      where: { id: handover.id },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        outgoingNurse: { select: { firstName: true, lastName: true } },
        incomingNurse: { select: { firstName: true, lastName: true } },
        shift: { select: { name: true } },
        sections: true,
      },
    });

    const completeness = computeCompleteness((created?.sections || []) as SectionData[]);

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'HANDOVER', entityId: handover.id },
    });

    res.status(201).json({ success: true, data: { ...created, completeness: completeness.percentage } });
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

// PUT /handovers/:id - Update sections (draft only)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateSectionsSchema.parse(req.body);

    const existing = await prisma.handover.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'READY_FOR_REVIEW') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Can only edit handover in DRAFT or READY_FOR_REVIEW status' },
      });
      return;
    }

    if (existing.outgoingNurseId !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the outgoing nurse can edit this handover' },
      });
      return;
    }

    for (const [type, content] of Object.entries(body.sections)) {
      if (content !== undefined) {
        const existingSection = await prisma.handoverSection.findUnique({
          where: { handoverId_sectionType: { handoverId: id, sectionType: type } },
        });

        if (existingSection) {
          await prisma.handoverSection.update({
            where: { id: existingSection.id },
            data: { content, isComplete: content.trim().length > 0 },
          });
        } else if (content.trim().length > 0) {
          await prisma.handoverSection.create({
            data: {
              handoverId: id,
              sectionType: type,
              content,
              isComplete: true,
            },
          });
        }
      }
    }

    await createHandoverEvent(id, 'UPDATED', req.user?.id ?? '');
    await createHandoverSnapshot(id, req.user?.id ?? '');

    const updated = await prisma.handover.findUnique({
      where: { id },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        outgoingNurse: { select: { firstName: true, lastName: true } },
        incomingNurse: { select: { firstName: true, lastName: true } },
        shift: { select: { name: true } },
        sections: true,
      },
    });

    const completeness = computeCompleteness((updated?.sections || []) as SectionData[]);

    res.json({ success: true, data: { ...updated, completeness: completeness.percentage } });
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

// POST /handovers/:id/transition
router.post('/:id/transition', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = z.object({ status: z.string() }).parse(req.body);

    const existing = await prisma.handover.findUnique({
      where: { id },
      include: { sections: true },
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    if (existing.outgoingNurseId !== req.user?.id && existing.incomingNurseId !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to transition this handover' },
      });
      return;
    }

    const allowed = VALID_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot transition from ${existing.status} to ${status}` },
      });
      return;
    }

    if (status === 'READY_FOR_REVIEW') {
      const validation = validateHandoverForSubmission(existing.sections as SectionData[]);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: { code: 'INCOMPLETE', message: validation.errors.join('; ') },
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'SUBMITTED') updateData.submittedAt = new Date();
    if (status === 'RECEIVED') updateData.receivedAt = new Date();
    if (status === 'ACCEPTED') updateData.acceptedAt = new Date();

    const handover = await prisma.handover.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        outgoingNurse: { select: { firstName: true, lastName: true } },
        incomingNurse: { select: { firstName: true, lastName: true } },
      },
    });

    await createHandoverEvent(id, `TRANSITIONED_TO_${status}`, req.user?.id ?? '', { from: existing.status, to: status });
    await createHandoverSnapshot(id, req.user?.id ?? '');

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: `TRANSITION_${status}`, entity: 'HANDOVER', entityId: id, details: { from: existing.status, to: status } },
    });

    if (status === 'READY_FOR_REVIEW' && existing.incomingNurseId) {
      await prisma.notification.create({
        data: {
          userId: existing.incomingNurseId,
          type: 'HANDOVER_SUMMARY',
          title: 'Handover Ready for Review',
          message: `${handover.outgoingNurse.firstName} ${handover.outgoingNurse.lastName} has prepared a handover for patient ${handover.patient.firstName} ${handover.patient.lastName}. Please review.`,
        },
      });
    }

    if (status === 'SUBMITTED' && existing.incomingNurseId) {
      await prisma.notification.create({
        data: {
          userId: existing.incomingNurseId,
          type: 'HANDOVER_SUBMITTED',
          title: 'Handover Submitted',
          message: `${handover.outgoingNurse.firstName} ${handover.outgoingNurse.lastName} has submitted a handover for patient ${handover.patient.firstName} ${handover.patient.lastName}.`,
        },
      });
    }

    if (status === 'RECEIVED' && existing.outgoingNurseId) {
      await prisma.notification.create({
        data: {
          userId: existing.outgoingNurseId,
          type: 'HANDOVER_RECEIVED',
          title: 'Handover Received',
          message: `${handover.incomingNurse?.firstName} ${handover.incomingNurse?.lastName} has received the handover for patient ${handover.patient.firstName} ${handover.patient.lastName}.`,
        },
      });
    }

    if (status === 'ACCEPTED' && existing.outgoingNurseId) {
      await prisma.notification.create({
        data: {
          userId: existing.outgoingNurseId,
          type: 'HANDOVER_ACCEPTED',
          title: 'Handover Accepted',
          message: `${handover.incomingNurse?.firstName} ${handover.incomingNurse?.lastName} has accepted the handover for patient ${handover.patient.firstName} ${handover.patient.lastName}.`,
        },
      });
    }

    res.json({ success: true, data: handover });
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

// POST /handovers/:id/clarifications - Request clarification
router.post('/:id/clarifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { question } = z.object({ question: z.string().min(1).max(2000) }).parse(req.body);

    const handover = await prisma.handover.findUnique({ where: { id } });
    if (!handover) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    if (handover.incomingNurseId !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the incoming nurse can request clarification' },
      });
      return;
    }

    if (!['RECEIVED', 'CLARIFICATION_RESPONDED'].includes(handover.status)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Can only request clarification when handover is RECEIVED or CLARIFICATION_RESPONDED' },
      });
      return;
    }

    const clarification = await prisma.handoverClarification.create({
      data: {
        handoverId: id,
        requestedBy: req.user?.id ?? '',
        question,
        status: 'pending',
      },
    });

    await prisma.handover.update({
      where: { id },
      data: { status: 'CLARIFICATION_REQUIRED' },
    });

    await createHandoverEvent(id, 'CLARIFICATION_REQUESTED', req.user?.id ?? '', { question });
    await createHandoverSnapshot(id, req.user?.id ?? '');

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CLARIFICATION_REQUESTED', entity: 'HANDOVER', entityId: id },
    });

    if (handover.outgoingNurseId) {
      await prisma.notification.create({
        data: {
          userId: handover.outgoingNurseId,
          type: 'HANDOVER_CLARIFICATION',
          title: 'Clarification Requested',
          message: `A clarification has been requested for the handover of patient. Please respond.`,
        },
      });
    }

    res.status(201).json({ success: true, data: clarification });
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

// PUT /handovers/:id/clarifications/:clarificationId/respond - Respond to clarification
router.put('/:id/clarifications/:clarificationId/respond', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const clarificationId = Array.isArray(req.params.clarificationId) ? req.params.clarificationId[0] : req.params.clarificationId;
    const { response } = z.object({ response: z.string().min(1).max(2000) }).parse(req.body);

    const handover = await prisma.handover.findUnique({ where: { id } });
    if (!handover) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    if (handover.outgoingNurseId !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only the outgoing nurse can respond to clarifications' },
      });
      return;
    }

    const clarification = await prisma.handoverClarification.findFirst({
      where: { id: clarificationId, handoverId: id },
    });
    if (!clarification) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Clarification not found' },
      });
      return;
    }

    if (clarification.status === 'answered') {
      res.status(400).json({
        success: false,
        error: { code: 'ALREADY_RESPONDED', message: 'This clarification has already been answered' },
      });
      return;
    }

    const updated = await prisma.handoverClarification.update({
      where: { id: clarificationId },
      data: {
        response,
        respondedBy: req.user?.id ?? '',
        status: 'answered',
      },
    });

    await prisma.handover.update({
      where: { id },
      data: { status: 'CLARIFICATION_RESPONDED' },
    });

    await createHandoverEvent(id, 'CLARIFICATION_RESPONDED', req.user?.id ?? '', { clarificationId });
    await createHandoverSnapshot(id, req.user?.id ?? '');

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CLARIFICATION_RESPONDED', entity: 'HANDOVER', entityId: id },
    });

    if (handover.incomingNurseId) {
      await prisma.notification.create({
        data: {
          userId: handover.incomingNurseId,
          type: 'HANDOVER_CLARIFICATION',
          title: 'Clarification Responded',
          message: `A clarification for the handover has been answered. Please review the response.`,
        },
      });
    }

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

// GET /handovers/:id/clarifications - List clarifications for a handover
router.get('/:id/clarifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const handover = await prisma.handover.findUnique({ where: { id } });
    if (!handover) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    const clarifications = await prisma.handoverClarification.findMany({
      where: { handoverId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: clarifications });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// GET /handovers/:id/populate - Auto-populate SBAR from patient data
router.get('/:id/populate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const handover = await prisma.handover.findUnique({ where: { id } });
    if (!handover) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: handover.patientId },
      include: {
        ward: { select: { name: true } },
        bed: { select: { number: true } },
      },
    });

    const latestVitals = await prisma.vitalSign.findFirst({
      where: { patientId: handover.patientId },
      orderBy: { recordedAt: 'desc' },
    });

    const latestAssessments = await prisma.nursingAssessment.findMany({
      where: { patientId: handover.patientId },
      orderBy: { assessedAt: 'desc' },
      take: 5,
    });

    const pendingTasks = await prisma.nursingTask.findMany({
      where: { patientId: handover.patientId, status: { not: 'COMPLETED' } },
      orderBy: { createdAt: 'desc' },
    });

    const populatedSections: Record<string, string> = {};

    if (patient) {
      populatedSections.SITUATION = [
        `Patient: ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`,
        `Location: ${patient.ward?.name || 'N/A'}, Bed ${patient.bed?.number || 'N/A'}`,
        `Gender: ${patient.gender}, Status: ${patient.status}`,
      ].join('\n');
    }

    if (latestVitals) {
      const vitalLines: string[] = ['Latest Vital Signs:'];
      if (latestVitals.temperature) vitalLines.push(`  Temperature: ${latestVitals.temperature}°C`);
      if (latestVitals.heartRate) vitalLines.push(`  Heart Rate: ${latestVitals.heartRate} bpm`);
      if (latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic) vitalLines.push(`  Blood Pressure: ${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic} mmHg`);
      if (latestVitals.oxygenSaturation) vitalLines.push(`  SpO2: ${latestVitals.oxygenSaturation}%`);
      if (latestVitals.painScale != null) vitalLines.push(`  Pain: ${latestVitals.painScale}/10`);
      if (latestVitals.bloodGlucose) vitalLines.push(`  Blood Glucose: ${latestVitals.bloodGlucose} mg/dL`);
      vitalLines.push(`  Recorded: ${latestVitals.recordedAt.toISOString()}`);
      populatedSections.BACKGROUND = vitalLines.join('\n');
    }

    if (latestAssessments.length > 0) {
      const assessmentLines: string[] = ['Recent Assessments:'];
      for (const a of latestAssessments) {
        assessmentLines.push(`  [${a.assessmentType}] ${a.findings.slice(0, 200)}`);
      }
      populatedSections.ASSESSMENT = assessmentLines.join('\n');
    }

    if (pendingTasks.length > 0) {
      const taskLines: string[] = ['Pending Tasks:'];
      for (const t of pendingTasks) {
        taskLines.push(`  [${t.priority.toUpperCase()}] ${t.title}${t.description ? ` - ${t.description.slice(0, 100)}` : ''}`);
      }
      populatedSections.RECOMMENDATION = taskLines.join('\n');
    }

    res.json({ success: true, data: populatedSections });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

// DELETE /handovers/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existing = await prisma.handover.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Handover not found' },
      });
      return;
    }

    if (existing.outgoingNurseId !== req.user?.id && !req.user?.roles.includes('ADMINISTRATOR')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to delete this handover' },
      });
      return;
    }

    if (existing.status !== 'DRAFT') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Only draft handovers can be deleted' },
      });
      return;
    }

    await prisma.handover.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'HANDOVER', entityId: id },
    });

    res.json({ success: true, data: { message: 'Handover deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as handoverRouter };
