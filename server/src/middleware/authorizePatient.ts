import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate.js';
import { prisma } from '../config/database.js';

export async function authorizePatientAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  const userRoles = req.user.roles;
  const userId = req.user.id;

  if (userRoles.includes('ADMINISTRATOR') || userRoles.includes('SUPERVISOR')) {
    next();
    return;
  }

  const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  if (!patientId) {
    next();
    return;
  }

  const assignment = await prisma.nurseAssignment.findFirst({
    where: {
      nurseId: userId,
      isActive: true,
      ward: {
        patients: {
          some: {
            id: patientId,
          },
        },
      },
    },
  });

  if (!assignment) {
    const handover = await prisma.handover.findFirst({
      where: {
        patientId,
        OR: [
          { outgoingNurseId: userId },
          { incomingNurseId: userId },
        ],
      },
    });

    if (!handover) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this patient',
        },
      });
      return;
    }
  }

  next();
}
