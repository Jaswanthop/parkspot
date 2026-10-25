import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return next(new AppError(401, 'Please sign in to continue.'));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return next(new AppError(401, 'Your session is invalid or has expired.'));
  }

  try {
    const user = await User.findById(payload.sub);
    if (!user) {
      return next(new AppError(401, 'This account no longer exists.'));
    }
    req.user = user;
    return next();
  } catch {
    return next(new AppError(401, 'Could not verify your session.'));
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    return next(new AppError(403, 'Admin access is required for this action.'));
  }
  return next();
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}
