import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createStudySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const updateStudySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const createParticipantSchema = z.object({
  userId: z.string().uuid(),
  studyCode: z.string().min(1).max(50),
  role: z.enum(['NURSE', 'SUPERVISOR']),
});

const createSurveySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

const createQuestionSchema = z.object({
  question: z.string().min(1),
  questionType: z.enum(['likert', 'multiple_choice', 'text', 'numeric']),
  options: z.any().optional(),
  isRequired: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

const createResponseSchema = z.object({
  participantId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.any(),
});

const createMetricSchema = z.object({
  participantId: z.string().uuid().optional(),
  metricName: z.enum([
    'handover_completeness',
    'handover_duration',
    'information_omission',
    'clarification_frequency',
    'task_completion',
    'user_satisfaction',
    'usability',
    'perceived_usefulness',
  ]),
  metricValue: z.any(),
  period: z.enum(['pre', 'post']),
  source: z.string().max(50).optional(),
  recordedAt: z.string().datetime().optional(),
});

// ===========================
// Research Studies
// ===========================

router.get('/studies', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (_req: AuthRequest, res: Response) => {
  try {
    const studies = await prisma.researchStudy.findMany({
      include: {
        _count: { select: { participants: true, surveys: true, metrics: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: studies });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.get('/studies/:id', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const study = await prisma.researchStudy.findUnique({
      where: { id },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        surveys: { include: { _count: { select: { questions: true, responses: true } } } },
        _count: { select: { metrics: true } },
      },
    });
    if (!study) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });
      return;
    }
    res.json({ success: true, data: study });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/studies', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createStudySchema.parse(req.body);
    const study = await prisma.researchStudy.create({
      data: {
        title: body.title,
        description: body.description,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    await prisma.auditLog.create({ data: { userId: req.user?.id, action: 'CREATE', entity: 'RESEARCH_STUDY', entityId: study.id } });
    res.status(201).json({ success: true, data: study });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.put('/studies/:id', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = updateStudySchema.parse(req.body);
    const updateData: Record<string, unknown> = { ...body };
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    const study = await prisma.researchStudy.update({ where: { id }, data: updateData });
    await prisma.auditLog.create({ data: { userId: req.user?.id, action: 'UPDATE', entity: 'RESEARCH_STUDY', entityId: id } });
    res.json({ success: true, data: study });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.delete('/studies/:id', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.researchStudy.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: req.user?.id, action: 'DELETE', entity: 'RESEARCH_STUDY', entityId: id } });
    res.json({ success: true, data: { message: 'Study deleted' } });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// ===========================
// Participants
// ===========================

router.get('/studies/:studyId/participants', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const participants = await prisma.researchParticipant.findMany({
      where: { studyId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { enrolledAt: 'desc' },
    });
    res.json({ success: true, data: participants });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/studies/:studyId/participants', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const body = createParticipantSchema.parse(req.body);
    const participant = await prisma.researchParticipant.create({
      data: { studyId, userId: body.userId, studyCode: body.studyCode, role: body.role },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    await prisma.auditLog.create({ data: { userId: req.user?.id, action: 'CREATE', entity: 'RESEARCH_PARTICIPANT', entityId: participant.id } });
    res.status(201).json({ success: true, data: participant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// ===========================
// Surveys
// ===========================

router.get('/studies/:studyId/surveys', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const surveys = await prisma.researchSurvey.findMany({
      where: { studyId },
      include: { _count: { select: { questions: true, responses: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: surveys });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/studies/:studyId/surveys', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const body = createSurveySchema.parse(req.body);
    const survey = await prisma.researchSurvey.create({
      data: { studyId, title: body.title, description: body.description },
    });
    res.status(201).json({ success: true, data: survey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.get('/surveys/:surveyId/questions', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const surveyId = Array.isArray(req.params.surveyId) ? req.params.surveyId[0] : req.params.surveyId;
    const questions = await prisma.surveyQuestion.findMany({
      where: { surveyId },
      orderBy: { orderIndex: 'asc' },
    });
    res.json({ success: true, data: questions });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/surveys/:surveyId/questions', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const surveyId = Array.isArray(req.params.surveyId) ? req.params.surveyId[0] : req.params.surveyId;
    const body = createQuestionSchema.parse(req.body);
    const maxOrder = await prisma.surveyQuestion.findFirst({
      where: { surveyId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const question = await prisma.surveyQuestion.create({
      data: {
        surveyId,
        question: body.question,
        questionType: body.questionType,
        options: body.options,
        isRequired: body.isRequired ?? true,
        orderIndex: body.orderIndex ?? ((maxOrder?.orderIndex ?? 0) + 1),
      },
    });
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.get('/surveys/:surveyId/responses', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const surveyId = Array.isArray(req.params.surveyId) ? req.params.surveyId[0] : req.params.surveyId;
    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      include: {
        question: { select: { id: true, question: true, questionType: true } },
        participant: { select: { id: true, studyCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: responses });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/surveys/:surveyId/responses', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const surveyId = Array.isArray(req.params.surveyId) ? req.params.surveyId[0] : req.params.surveyId;
    const body = createResponseSchema.parse(req.body);
    const survey = await prisma.researchSurvey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Survey not found' } });
      return;
    }
    const response = await prisma.surveyResponse.create({
      data: { surveyId, questionId: body.questionId, participantId: body.participantId, answer: body.answer },
    });
    res.status(201).json({ success: true, data: response });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// ===========================
// Metrics
// ===========================

router.get('/studies/:studyId/metrics', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const { metricName, period } = req.query as { metricName?: string; period?: string };
    const where: Record<string, unknown> = { studyId };
    if (metricName) where.metricName = metricName;
    if (period) where.period = period;
    const metrics = await prisma.researchMetric.findMany({ where, orderBy: { recordedAt: 'desc' } });
    res.json({ success: true, data: metrics });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.post('/studies/:studyId/metrics', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const body = createMetricSchema.parse(req.body);
    const metric = await prisma.researchMetric.create({
      data: {
        studyId,
        participantId: body.participantId,
        metricName: body.metricName,
        metricValue: body.metricValue,
        period: body.period,
        source: body.source,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : undefined,
      },
    });
    res.status(201).json({ success: true, data: metric });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.issues } });
      return;
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// ===========================
// De-identified Export
// ===========================

router.get('/studies/:studyId/export/csv', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const { type } = req.query as { type?: string };

    if (type === 'metrics') {
      const metrics = await prisma.researchMetric.findMany({
        where: { studyId },
        orderBy: { recordedAt: 'asc' },
      });
      const headers = 'study_code,metric_name,metric_value,period,source,recorded_at\n';
      const rows = metrics.map((m) => {
        const participant = m.participantId ? `P-${m.participantId.slice(0, 8)}` : 'aggregate';
        return `${participant},${m.metricName},${JSON.stringify(m.metricValue).replace(/"/g, '""')},${m.period},${m.source || ''},${m.recordedAt.toISOString()}`;
      }).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="study-${studyId}-metrics.csv"`);
      res.send(headers + rows);
      return;
    }

    if (type === 'surveys') {
      const responses = await prisma.surveyResponse.findMany({
        where: { survey: { studyId } },
        include: {
          question: { select: { id: true, question: true, questionType: true, orderIndex: true } },
          participant: { select: { studyCode: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      const headers = 'study_code,question,question_type,answer,recorded_at\n';
      const rows = responses.map((r) => {
        return `${r.participant.studyCode},"${r.question.question.replace(/"/g, '""')}",${r.question.questionType},"${JSON.stringify(r.answer).replace(/"/g, '""')}",${r.createdAt.toISOString()}`;
      }).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="study-${studyId}-surveys.csv"`);
      res.send(headers + rows);
      return;
    }

    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'type must be metrics or surveys' } });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

router.get('/studies/:studyId/export/xlsx', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const studyId = Array.isArray(req.params.studyId) ? req.params.studyId[0] : req.params.studyId;
    const { type } = req.query as { type?: string };

    if (type === 'metrics') {
      const metrics = await prisma.researchMetric.findMany({
        where: { studyId },
        orderBy: { recordedAt: 'asc' },
      });
      const data = metrics.map((m) => ({
        'Study Code': m.participantId ? `P-${m.participantId.slice(0, 8)}` : 'aggregate',
        'Metric Name': m.metricName,
        'Metric Value': JSON.stringify(m.metricValue),
        Period: m.period,
        Source: m.source || '',
        'Recorded At': m.recordedAt.toISOString(),
      }));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="study-${studyId}-metrics.json"`);
      res.json({ format: 'xlsx-compatible-json', data });
      return;
    }

    if (type === 'surveys') {
      const responses = await prisma.surveyResponse.findMany({
        where: { survey: { studyId } },
        include: {
          question: { select: { question: true, questionType: true } },
          participant: { select: { studyCode: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      const data = responses.map((r) => ({
        'Study Code': r.participant.studyCode,
        Question: r.question.question,
        'Question Type': r.question.questionType,
        Answer: JSON.stringify(r.answer),
        'Recorded At': r.createdAt.toISOString(),
      }));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="study-${studyId}-surveys.json"`);
      res.json({ format: 'xlsx-compatible-json', data });
      return;
    }

    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'type must be metrics or surveys' } });
  } catch (_error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export { router as researchRouter };
