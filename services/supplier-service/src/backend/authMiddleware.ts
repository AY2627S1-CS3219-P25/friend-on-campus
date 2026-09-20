/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Implemented authentication and RBAC middleware for Supplier Service to verify User Service JWT tokens.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@campus-errand/common-dtos';

const JWT_SECRET = process.env.JWT_SECRET || 'cs3219supersecretjwtkey123';

export interface AuthenticatedSupplierRequest extends Request {
  user?: JWTPayload;
}

/**
 * Validates the JWT issued by User Service.
 */
export function authenticateToken(
  req: AuthenticatedSupplierRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token required to perform this action',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token is invalid or expired',
    });
    return;
  }
}

/**
 * Enforces that only users with role 'ADMIN' can mutate suppliers.
 */
export function requireAdmin(
  req: AuthenticatedSupplierRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Access denied: Administrator privileges required to modify campus suppliers',
    });
    return;
  }

  next();
}
