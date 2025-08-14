import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../utils/jwt';
import { ResponseUtil } from '../utils/response';
import { JWTPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.unauthorized(res, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return ResponseUtil.unauthorized(res, 'Access token is required');
    }

    const decoded = JWTUtil.verifyToken(token);
    req.user = decoded;
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.unauthorized(res, 'Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      return ResponseUtil.unauthorized(res, 'Invalid token');
    }
    return ResponseUtil.unauthorized(res, 'Authentication failed');
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return ResponseUtil.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = JWTUtil.verifyToken(token);
        req.user = decoded;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};