import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { ResponseUtil } from '../utils/response';
import { JWTUtil } from '../utils/jwt';
import { User } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone } = req.body;

      // Check if user already exists
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if ((existingUsers as any[]).length > 0) {
        return ResponseUtil.badRequest(res, 'User with this email already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const [result] = await pool.execute(
        'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, phone]
      );

      const userId = (result as any).insertId;

      // Generate JWT token
      const token = JWTUtil.generateToken({
        id: userId,
        email,
        role: 'user'
      });

      const refreshToken = JWTUtil.generateRefreshToken({
        id: userId,
        email,
        role: 'user'
      });

      return ResponseUtil.success(res, 'User registered successfully', {
        user: {
          id: userId,
          name,
          email,
          phone,
          role: 'user'
        },
        token,
        refreshToken
      }, 201);

    } catch (error: any) {
      console.error('Register error:', error);
      return ResponseUtil.error(res, 'Registration failed', 500, error.message);
    }
  }

  // Login user
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      const user = (users as User[])[0];

      if (!user) {
        return ResponseUtil.badRequest(res, 'Invalid email or password');
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return ResponseUtil.badRequest(res, 'Invalid email or password');
      }

      // Generate JWT token
      const token = JWTUtil.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = JWTUtil.generateRefreshToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      return ResponseUtil.success(res, 'Login successful', {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          is_verified: user.is_verified
        },
        token,
        refreshToken
      });

    } catch (error: any) {
      console.error('Login error:', error);
      return ResponseUtil.error(res, 'Login failed', 500, error.message);
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ResponseUtil.badRequest(res, 'Refresh token is required');
      }

      const decoded = JWTUtil.verifyRefreshToken(refreshToken);

      // Generate new tokens
      const newToken = JWTUtil.generateToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      });

      const newRefreshToken = JWTUtil.generateRefreshToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      });

      return ResponseUtil.success(res, 'Token refreshed successfully', {
        token: newToken,
        refreshToken: newRefreshToken
      });

    } catch (error: any) {
      console.error('Refresh token error:', error);
      return ResponseUtil.unauthorized(res, 'Invalid refresh token');
    }
  }

  // Get current user profile
  static async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const [users] = await pool.execute(
        'SELECT id, name, email, phone, role, is_verified, created_at FROM users WHERE id = ?',
        [userId]
      );

      const user = (users as any[])[0];

      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      return ResponseUtil.success(res, 'Profile retrieved successfully', user);

    } catch (error: any) {
      console.error('Get profile error:', error);
      return ResponseUtil.error(res, 'Failed to get profile', 500, error.message);
    }
  }

  // Update user profile
  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { name, phone } = req.body;

      await pool.execute(
        'UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, phone, userId]
      );

      const [users] = await pool.execute(
        'SELECT id, name, email, phone, role, is_verified, created_at FROM users WHERE id = ?',
        [userId]
      );

      const updatedUser = (users as any[])[0];

      return ResponseUtil.success(res, 'Profile updated successfully', updatedUser);

    } catch (error: any) {
      console.error('Update profile error:', error);
      return ResponseUtil.error(res, 'Failed to update profile', 500, error.message);
    }
  }

  // Change password
  static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      // Get current user
      const [users] = await pool.execute(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );

      const user = (users as any[])[0];

      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);

      if (!isValidPassword) {
        return ResponseUtil.badRequest(res, 'Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await pool.execute(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, userId]
      );

      return ResponseUtil.success(res, 'Password changed successfully');

    } catch (error: any) {
      console.error('Change password error:', error);
      return ResponseUtil.error(res, 'Failed to change password', 500, error.message);
    }
  }
}