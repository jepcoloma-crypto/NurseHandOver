import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../lib/token.js';
import { prisma } from '../config/database.js';

export interface AuthRequest extends Request {
  user?: TokenPayload & {
    id: string;
    isActive: boolean;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
      return;
    }

    req.user = {
      ...payload,
      id: user.id,
      isActive: user.isActive,
    };

    next();
  } catch (_error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
}
