import { Router, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, wardId } = req.query as { startDate?: string; endDate?: string; wardId?: string };

    let allowedWardIds: string[] | null = null;
    if (req.user?.roles.includes('SUPERVISOR') && !req.user?.roles.includes('ADMINISTRATOR')) {
      const assignments = await prisma.nurseAssignment.findMany({
        where: { nurseId: req.user?.id, isActive: true },
        select: { wardId: true },
      });
      allowedWardIds = assignments.map((a) => a.wardId);
    }

    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const wardFilter: Record<string, unknown> = {};
    if (wardId) {
      wardFilter.wardId = wardId;
    } else if (allowedWardIds && allowedWardIds.length > 0) {
      wardFilter.wardId = { in: allowedWardIds };
    }

    const patientWhere = Object.keys(wardFilter).length > 0 ? wardFilter : undefined;

    const [handovers, tasks, clarifications, shifts, allWards] = await Promise.all([
      prisma.handover.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          ...(patientWhere ? { patient: patientWhere } : {}),
        },
        select: {
          id: true,
          status: true,
          completenessScore: true,
          submittedAt: true,
          receivedAt: true,
          acceptedAt: true,
          createdAt: true,
          shift: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.nursingTask.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          ...(patientWhere ? { patient: patientWhere } : {}),
        },
        select: {
          id: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.handoverClarification.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          handover: patientWhere ? { patient: patientWhere } : undefined,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.shift.findMany({
        where: { isActive: true },
        select: { id: true, name: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
      }),
      prisma.ward.findMany({
        where: allowedWardIds && allowedWardIds.length > 0 ? { id: { in: allowedWardIds } } : {},
        select: { id: true, name: true, department: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    const now = new Date();

    const completedHandovers = handovers.filter((h) => h.status === 'ACCEPTED');
    const totalHandovers = handovers.length;
    const submittedHandovers = handovers.filter((h) => ['SUBMITTED', 'RECEIVED', 'ACCEPTED', 'CLARIFICATION_REQUIRED'].includes(h.status));
    const pendingHandovers = handovers.filter((h) => ['DRAFT', 'READY_FOR_REVIEW'].includes(h.status));

    const durations = completedHandovers
      .filter((h) => h.createdAt && h.acceptedAt)
      .map((h) => new Date(h.acceptedAt!).getTime() - new Date(h.createdAt).getTime());
    const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const avgDurationMinutes = Math.round(avgDurationMs / 60000);

    const completenessScores = handovers
      .filter((h) => h.completenessScore !== null && h.completenessScore !== undefined)
      .map((h) => h.completenessScore!);
    const avgCompleteness = completenessScores.length > 0
      ? Math.round(completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length)
      : 0;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
    const overdueTasks = tasks.filter((t) =>
      ['PENDING', 'IN_PROGRESS'].includes(t.status) && t.dueDate && new Date(t.dueDate) < now
    );
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
    const overdueTaskRate = totalTasks > 0 ? Math.round((overdueTasks.length / totalTasks) * 100) : 0;

    const totalClarifications = clarifications.length;
    const respondedClarifications = clarifications.filter((c) => c.status === 'answered' || c.status === 'responded');
    const clarificationRate = totalHandovers > 0 ? Math.round((totalClarifications / totalHandovers) * 100) : 0;

    const handoversByStatus: Record<string, number> = {};
    handovers.forEach((h) => {
      handoversByStatus[h.status] = (handoversByStatus[h.status] || 0) + 1;
    });

    const tasksByStatus: Record<string, number> = {};
    tasks.forEach((t) => {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    });

    const handoversByShift: Record<string, { total: number; completed: number; pending: number; incomplete: number }> = {};
    handovers.forEach((h) => {
      const shiftName = h.shift?.name || 'Unknown';
      if (!handoversByShift[shiftName]) handoversByShift[shiftName] = { total: 0, completed: 0, pending: 0, incomplete: 0 };
      handoversByShift[shiftName].total++;
      if (h.status === 'ACCEPTED') handoversByShift[shiftName].completed++;
      if (['DRAFT', 'READY_FOR_REVIEW'].includes(h.status)) handoversByShift[shiftName].pending++;
      if (h.completenessScore !== null && h.completenessScore !== undefined && h.completenessScore < 50) handoversByShift[shiftName].incomplete++;
    });

    const handoversByDay: Record<string, number> = {};
    handovers.forEach((h) => {
      const day = new Date(h.createdAt).toISOString().split('T')[0];
      handoversByDay[day] = (handoversByDay[day] || 0) + 1;
    });

    const tasksByDay: Record<string, { created: number; completed: number; overdue: number }> = {};
    tasks.forEach((t) => {
      const day = new Date(t.createdAt).toISOString().split('T')[0];
      if (!tasksByDay[day]) tasksByDay[day] = { created: 0, completed: 0, overdue: 0 };
      tasksByDay[day].created++;
      if (t.status === 'COMPLETED') tasksByDay[day].completed++;
      if (['PENDING', 'IN_PROGRESS'].includes(t.status) && t.dueDate && new Date(t.dueDate) < now) tasksByDay[day].overdue++;
    });

    const completenessDistribution = { empty: 0, started: 0, partial: 0, complete: 0 };
    completenessScores.forEach((score) => {
      if (score >= 75) completenessDistribution.complete++;
      else if (score >= 50) completenessDistribution.partial++;
      else if (score >= 25) completenessDistribution.started++;
      else completenessDistribution.empty++;
    });

    const shiftReport = shifts.map((shift) => {
      const shiftHandovers = handovers.filter((h) => h.shift?.id === shift.id);
      return {
        shiftId: shift.id,
        shiftName: shift.name,
        totalHandovers: shiftHandovers.length,
        completedHandovers: shiftHandovers.filter((h) => h.status === 'ACCEPTED').length,
        avgCompleteness: shiftHandovers.length > 0
          ? Math.round(
              shiftHandovers
                .filter((h) => h.completenessScore !== null)
                .reduce((acc, h) => acc + (h.completenessScore || 0), 0) /
              Math.max(shiftHandovers.filter((h) => h.completenessScore !== null).length, 1)
            )
          : 0,
      };
    });

    res.json({
      success: true,
      data: {
        filters: { startDate: startDate || null, endDate: endDate || null, wardId: wardId || null },
        availableWards: allWards.map((w) => ({ id: w.id, name: w.name, department: w.department.name })),
        summary: {
          totalHandovers,
          completedHandovers: completedHandovers.length,
          pendingHandovers: pendingHandovers.length,
          submittedHandovers: submittedHandovers.length,
          avgCompleteness,
          avgDurationMinutes,
          clarificationRate,
          totalClarifications,
          respondedClarifications: respondedClarifications.length,
          totalTasks,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          taskCompletionRate,
          overdueTaskRate,
        },
        handoversByStatus,
        tasksByStatus,
        handoversByShift,
        handoversByDay,
        tasksByDay,
        completenessDistribution,
        shiftReport,
      },
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as analyticsRouter };
