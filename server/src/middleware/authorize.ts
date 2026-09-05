import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate.js';

export type Role = 'NURSE' | 'SUPERVISOR' | 'ADMINISTRATOR' | 'RESEARCHER';

export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}
