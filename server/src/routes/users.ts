import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hashPassword } from '../lib/password.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  roleIds: z.array(z.string().uuid()).min(1),
});

router.get('/', authenticate, authorize('ADMINISTRATOR'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: users.map((user) => ({
        ...user,
        roles: user.roles.map((ur: { role: { id: string; name: string } }) => ur.role),
      })),
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

router.get('/:id', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        ...user,
        roles: user.roles.map((ur: { role: { id: string; name: string } }) => ur.role),
      },
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

router.post('/', authenticate, authorize('ADMINISTRATOR'), async (req: AuthRequest, res: Response) => {
  try {
    const body = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Email already exists',
        },
      });
      return;
    }

    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        roles: {
          create: body.roleIds.map((roleId) => ({
            roleId,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'USER',
        entityId: user.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...user,
        roles: user.roles.map((ur: { role: { id: string; name: string } }) => ur.role),
      },
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

export { router as userRouter };
