import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/db.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  agentId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { agentProfile: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive or no longer exists');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      agentId: user.agentProfile?.id || null,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `User role ${req.user.role} is not authorized to perform this action`
        )
      );
    }

    next();
  };
}
