/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Implemented production-ready User Service with PostgreSQL Prisma integration, bcrypt password hashing, JWT authentication, RBAC authorization, profile protection, and role promotion.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  UserDTO,
  ApiResponse,
  AuthResponse,
  JWTPayload,
  RegisterUserRequest,
  LoginUserRequest,
  UpdateUserProfileRequest,
  PromoteUserRequest,
  UserRole,
} from '@campus-errand/common-dtos';
import {
  findUserByEmail,
  findUserById,
  findUserByMatric,
  createUser,
  updateUserProfile,
  updateUserRole,
  countAdmins,
  listUsers,
  toUserDTO,
} from './database/userRepository';
import {
  authenticateToken,
  requireRole,
  AuthenticatedRequest,
} from './middleware/authMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;
const JWT_SECRET = process.env.JWT_SECRET || 'cs3219supersecretjwtkey123';
const JWT_EXPIRES_IN = '24h';

app.use(cors());
app.use(express.json());

function generateToken(user: { id: string; nusEmail: string; role: string; fullName: string }): string {
  const payload: JWTPayload = {
    id: user.id,
    nusEmail: user.nusEmail,
    role: user.role as UserRole,
    fullName: user.fullName,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'user-service', status: 'UP', port: PORT, timestamp: new Date() });
});

// ----------------------------------------------------
// 1. Authentication Endpoints
// ----------------------------------------------------

/**
 * Register a new user account.
 * Automatically receives role 'STUDENT' and 100 welcome credits.
 */
app.post(
  '/api/auth/register',
  async (req: Request<{}, {}, RegisterUserRequest>, res: Response<ApiResponse<AuthResponse>>) => {
    try {
      const { nusEmail, password, fullName, matricNumber, phoneNumber, telegramHandle } = req.body;

      // 1. Validate required fields
      if (!nusEmail || !password || !fullName || !matricNumber) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'nusEmail, password, fullName, and matricNumber are required',
        });
      }

      // 2. Validate email format (NUS domain)
      const emailRegex = /^[^\s@]+@([a-zA-Z0-9-]+\.)*nus\.edu(\.sg)?$/i;
      if (!emailRegex.test(nusEmail.trim())) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_EMAIL',
          message: 'Must be a valid NUS email address (e.g., student@u.nus.edu or staff@nus.edu.sg)',
        });
      }

      // 3. Validate password length (per F1.1.4: 8-24 characters)
      if (password.length < 8 || password.length > 24) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PASSWORD',
          message: 'Password must be between 8 and 24 characters long',
        });
      }

      // 4. Check for duplicate email
      const existingEmail = await findUserByEmail(nusEmail);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'EMAIL_EXISTS',
          message: 'An account with this NUS email already exists',
        });
      }

      // 5. Check for duplicate matric number
      const existingMatric = await findUserByMatric(matricNumber);
      if (existingMatric) {
        return res.status(409).json({
          success: false,
          error: 'MATRIC_EXISTS',
          message: 'An account with this matriculation number already exists',
        });
      }

      // 6. Securely hash password with bcrypt (salt rounds = 10)
      const passwordHash = await bcrypt.hash(password, 10);

      // 7. Persist user in PostgreSQL
      const user = await createUser({
        nusEmail,
        passwordHash,
        fullName,
        matricNumber,
        phoneNumber,
        telegramHandle,
        role: 'STUDENT',
      });

      // 8. Generate JWT
      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        data: {
          token,
          user,
        },
        message: 'User registered successfully. Welcome to NUS CampusErrand!',
      });
    } catch (err: any) {
      console.error('[user-service] Register error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Failed to register user',
      });
    }
  }
);

/**
 * Login with NUS email & password.
 * Returns JWT token and User profile.
 */
app.post(
  '/api/auth/login',
  async (req: Request<{}, {}, LoginUserRequest>, res: Response<ApiResponse<AuthResponse>>) => {
    try {
      const { nusEmail, password } = req.body;

      if (!nusEmail || !password) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'nusEmail and password are required',
        });
      }

      const userRecord = await findUserByEmail(nusEmail);
      if (!userRecord) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, userRecord.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
      }

      const user = toUserDTO(userRecord);
      const token = generateToken(user);

      return res.json({
        success: true,
        data: {
          token,
          user,
        },
        message: 'Login successful',
      });
    } catch (err: any) {
      console.error('[user-service] Login error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Failed to login',
      });
    }
  }
);

// ----------------------------------------------------
// 2. User Profile Management Endpoints
// ----------------------------------------------------

/**
 * Get authenticated user's current profile.
 */
app.get('/api/users/me', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse<UserDTO>>) => {
  try {
    const userId = req.user!.id;
    const userRecord = await findUserById(userId);

    if (!userRecord) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User profile not found',
      });
    }

    return res.json({
      success: true,
      data: toUserDTO(userRecord),
    });
  } catch (err: any) {
    console.error('[user-service] /me error:', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'Failed to retrieve profile',
    });
  }
});

/**
 * Update authenticated user's profile.
 * Strictly prevents modification of protected fields: role, nusEmail, matricNumber, id.
 */
app.put(
  '/api/users/profile',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response<ApiResponse<UserDTO>>) => {
    try {
      const userId = req.user!.id;
      const { fullName, phoneNumber, telegramHandle } = req.body as UpdateUserProfileRequest;

      // Notice: If client sends `role`, `id`, `nusEmail`, or `matricNumber` in body,
      // userRepository.updateUserProfile ignores them completely, enforcing field immutability.
      const updatedUser = await updateUserProfile(userId, {
        fullName,
        phoneNumber,
        telegramHandle,
      });

      return res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully. Protected fields (role, email, matric) remained unchanged.',
      });
    } catch (err: any) {
      console.error('[user-service] Profile update error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Failed to update profile',
      });
    }
  }
);

// ----------------------------------------------------
// 3. User Administration & Role Lifecycle Endpoints
// ----------------------------------------------------

/**
 * Promote or demote a user's role.
 * Restricted to administrators only.
 * Edge case handling: Protects against demoting the system's last administrator.
 */
app.post(
  '/api/users/:id/promote',
  authenticateToken,
  requireRole('ADMIN'),
  async (req: AuthenticatedRequest, res: Response<ApiResponse<UserDTO>>) => {
    try {
      const targetUserId = req.params.id;
      const { role } = req.body as PromoteUserRequest;

      if (!role || (role !== 'STUDENT' && role !== 'ADMIN')) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_ROLE',
          message: "Role must be either 'STUDENT' or 'ADMIN'",
        });
      }

      const targetUser = await findUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Target user not found',
        });
      }

      // Edge case: If attempting to demote an admin to student, check if they are the last admin
      if (targetUser.role === 'ADMIN' && role === 'STUDENT') {
        const adminCount = await countAdmins();
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: 'LAST_ADMIN_PROTECTION',
            message: 'Cannot demote the last remaining administrator in the system',
          });
        }
      }

      const updated = await updateUserRole(targetUserId, role);

      return res.json({
        success: true,
        data: updated,
        message: `User ${updated.nusEmail} role successfully updated to ${role}`,
      });
    } catch (err: any) {
      console.error('[user-service] Role promote error:', err);
      return res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Failed to update user role',
      });
    }
  }
);

/**
 * List all users.
 * Accessible to administrators or authenticated users for directory lookup.
 */
app.get('/api/users', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const result = await listUsers(page, limit);
    return res.json({
      success: true,
      data: {
        items: result.users,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (err: any) {
    console.error('[user-service] List users error:', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: err.message || 'Failed to list users',
    });
  }
});

/**
 * Get user by ID.
 */
app.get('/api/users/:id', async (req: Request, res: Response<ApiResponse<UserDTO>>) => {
  try {
    const userRecord = await findUserById(req.params.id);
    if (!userRecord) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'User not found' });
    }
    return res.json({ success: true, data: toUserDTO(userRecord) });
  } catch (err: any) {
    console.error('[user-service] Get user error:', err);
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [User Service] running on port ${PORT} with PostgreSQL & Prisma`);
});
