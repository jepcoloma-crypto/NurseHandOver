import { Router, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/', authenticate, authorize('SUPERVISOR', 'ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const wardIds = await prisma.nurseAssignment.findMany({
      where: { nurseId: req.user?.id, isActive: true },
      select: { wardId: true },
    });
    const assignedWardIds = wardIds.map((a) => a.wardId);

    if (assignedWardIds.length === 0) {
      res.json({
        success: true,
        data: {
          assignedWards: [],
          stats: { totalPatients: 0, activeNurses: 0, completedHandovers: 0, pendingHandovers: 0, clarifications: 0, incompleteHandovers: 0, pendingTasks: 0, overdueTasks: 0 },
          wardBreakdown: [],
          recentHandovers: [],
          recentTasks: [],
        },
      });
      return;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [patients, activeNurseAssignments, handovers, tasks, wards] = await Promise.all([
      prisma.patient.findMany({
        where: { wardId: { in: assignedWardIds }, isActive: true },
        select: { id: true, firstName: true, lastName: true, mrn: true, status: true, wardId: true, ward: { select: { name: true } } },
      }),
      prisma.nurseAssignment.findMany({
        where: { wardId: { in: assignedWardIds }, isActive: true, assignedDate: { gte: todayStart } },
        select: { id: true, nurseId: true, wardId: true, nurse: { select: { id: true, firstName: true, lastName: true } }, ward: { select: { id: true, name: true } }, shift: { select: { name: true } } },
      }),
      prisma.handover.findMany({
        where: {
          patient: { wardId: { in: assignedWardIds } },
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, wardId: true } },
          outgoingNurse: { select: { id: true, firstName: true, lastName: true } },
          incomingNurse: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.nursingTask.findMany({
        where: {
          patient: { wardId: { in: assignedWardIds } },
          status: { in: ['PENDING', 'IN_PROGRESS', 'DEFERRED', 'COMPLETED'] },
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, wardId: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.ward.findMany({
        where: { id: { in: assignedWardIds } },
        select: { id: true, name: true, department: { select: { name: true } } },
      }),
    ]);

    const completedHandovers = handovers.filter((h) => h.status === 'ACCEPTED');
    const pendingHandovers = handovers.filter((h) => ['DRAFT', 'READY_FOR_REVIEW', 'SUBMITTED', 'RECEIVED'].includes(h.status));
    const clarificationHandovers = handovers.filter((h) => h.status === 'CLARIFICATION_REQUIRED');
    const incompleteHandovers = handovers.filter((h) => {
      if (h.completenessScore !== null && h.completenessScore !== undefined && h.completenessScore < 50) return true;
      if (['DRAFT', 'READY_FOR_REVIEW'].includes(h.status)) return true;
      return false;
    });

    const pendingTasks = tasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status));
    const overdueTasks = tasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status) && t.dueDate && new Date(t.dueDate) < now);

    const wardBreakdown = wards.map((ward) => {
      const wardPatients = patients.filter((p) => p.wardId === ward.id);
      const wardNurses = activeNurseAssignments.filter((a) => a.wardId === ward.id);
      const wardHandovers = handovers.filter((h) => h.patient?.wardId === ward.id);
      const wardTasks = tasks.filter((t) => t.patient?.wardId === ward.id);
      const wardPending = wardTasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status));
      const wardOverdue = wardTasks.filter((t) => ['PENDING', 'IN_PROGRESS'].includes(t.status) && t.dueDate && new Date(t.dueDate) < now);

      return {
        wardId: ward.id,
        wardName: ward.name,
        departmentName: ward.department.name,
        patientCount: wardPatients.length,
        activeNurseCount: wardNurses.length,
        completedHandovers: wardHandovers.filter((h) => h.status === 'ACCEPTED').length,
        pendingHandovers: wardHandovers.filter((h) => ['DRAFT', 'READY_FOR_REVIEW', 'SUBMITTED', 'RECEIVED'].includes(h.status)).length,
        clarifications: wardHandovers.filter((h) => h.status === 'CLARIFICATION_REQUIRED').length,
        incompleteHandovers: wardHandovers.filter((h) => (h.completenessScore !== null && h.completenessScore !== undefined && h.completenessScore < 50) || ['DRAFT', 'READY_FOR_REVIEW'].includes(h.status)).length,
        pendingTasks: wardPending.length,
        overdueTasks: wardOverdue.length,
      };
    });

    const recentHandovers = handovers.slice(0, 10).map((h) => ({
      id: h.id,
      patient: h.patient,
      outgoingNurse: h.outgoingNurse,
      incomingNurse: h.incomingNurse,
      status: h.status,
      completeness: h.completenessScore,
      createdAt: h.createdAt,
    }));

    const recentTasks = tasks.slice(0, 10).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      patient: t.patient,
      assignedTo: t.assignee,
    }));

    const uniqueNurseIds = new Set(activeNurseAssignments.map((a) => a.nurseId));

    res.json({
      success: true,
      data: {
        assignedWards: wards.map((w) => ({ id: w.id, name: w.name, department: w.department.name })),
        stats: {
          totalPatients: patients.length,
          activeNurses: uniqueNurseIds.size,
          completedHandovers: completedHandovers.length,
          pendingHandovers: pendingHandovers.length,
          clarifications: clarificationHandovers.length,
          incompleteHandovers: incompleteHandovers.length,
          pendingTasks: pendingTasks.length,
          overdueTasks: overdueTasks.length,
        },
        wardBreakdown,
        recentHandovers,
        recentTasks,
      },
    });
  } catch (_error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

export { router as supervisorDashboardRouter };
