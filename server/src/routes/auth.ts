import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateToken } from '../lib/token.js';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    const validPassword = await comparePassword(body.password, user.passwordHash);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    const roles = user.roles.map((ur) => ur.role.name);

    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'USER',
        entityId: user.id,
      },
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles,
        },
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

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'LOGOUT',
        entity: 'USER',
        entityId: req.user?.id,
      },
    });

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
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

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
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
        roles: user.roles.map((ur) => ur.role.name),
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

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const body = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
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

    const validPassword = await comparePassword(body.currentPassword, user.passwordHash);

    if (!validPassword) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
      return;
    }

    const newHash = await hashPassword(body.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGE',
        entity: 'USER',
        entityId: user.id,
      },
    });

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
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

export { router as authRouter };
