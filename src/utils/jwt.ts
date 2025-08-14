import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWTPayload } from '../types'; // Pastikan ini extends JwtPayload

const JWT_SECRET = process.env.JWT_SECRET as string; // Type assertion
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

export class JWTUtil {
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  }

  static verifyRefreshToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  }

  static decodeToken(token: string): JWTPayload | null {
    return jwt.decode(token) as JWTPayload | null;
  }
}