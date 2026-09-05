import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const alertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  parameter: z.enum([
    'temperature', 'heartRate', 'respiratoryRate',
    'bloodPressureSystolic', 'bloodPressureDiastolic',
    'oxygenSaturation', 'painScale', 'bloodGlucose',
  ]),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq']),
  threshold: z.number(),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
});

const operatorMap: Record<string, (val: number, threshold: number) => boolean> = {
  gt: (val, threshold) => val > threshold,
  gte: (val, threshold) => val >= threshold,
  lt: (val, threshold) => val < threshold,
  lte: (val, threshold) => val <= threshold,
  eq: (val, threshold) => val === threshold,
};

export function evaluateAlertRules(vitalData: Record<string, number | undefined>): { rule: { name: string; severity: string; parameter: string }; value: number }[] {
  const alerts: { rule: { name: string; severity: string; parameter: string }; value: number }[] = [];

  for (const [param, value] of Object.entries(vitalData)) {
    if (value === undefined) continue;

    const matchingRules = (globalThis as Record<string, unknown>).__alertRules as
      | { name: string; parameter: string; operator: string; threshold: { toNumber: () => number }; severity: string }[]
      | undefined;

    if (!matchingRules) continue;

    for (const rule of matchingRules) {
      if (rule.parameter === param) {
        const compare = operatorMap[rule.operator];
        if (compare && compare(value, rule.threshold.toNumber())) {
          alerts.push({
            rule: { name: rule.name, severity: rule.severity, parameter: rule.parameter },
            value,
          });
        }
      }
    }
  }

  return alerts;
}

router.get('/', authenticate, authorize('ADMINISTRATOR', 'SUPERVISOR'), async (_req: AuthRequest, res: Response) => {
  try {
    const rules = await prisma.alertRule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: rules });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

router.post('/', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = alertRuleSchema.parse(req.body);
    const rule = await prisma.alertRule.create({ data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'CREATE', entity: 'ALERT_RULE', entityId: rule.id },
    });

    await loadAlertRules();
    res.status(201).json({ success: true, data: rule });
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
    const body = alertRuleSchema.partial().parse(req.body);

    const rule = await prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alert rule not found' },
      });
      return;
    }

    const updated = await prisma.alertRule.update({ where: { id }, data: body });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'UPDATE', entity: 'ALERT_RULE', entityId: id },
    });

    await loadAlertRules();
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

    const rule = await prisma.alertRule.findUnique({ where: { id } });
    if (!rule) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alert rule not found' },
      });
      return;
    }

    await prisma.alertRule.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: req.user?.id, action: 'DELETE', entity: 'ALERT_RULE', entityId: id },
    });

    await loadAlertRules();
    res.json({ success: true, data: { message: 'Alert rule deleted' } });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export async function loadAlertRules(): Promise<void> {
  const rules = await prisma.alertRule.findMany({ where: { isActive: true } });
  (globalThis as Record<string, unknown>).__alertRules = rules;
}

export { router as alertRuleRouter };
