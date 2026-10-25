import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { serializeUser } from '../utils/serialize.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.exists({ email });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists. Try signing in.');
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: await User.hashPassword(password),
    role: 'user',
  });

  res.status(201).json({ token: signToken(user), user: serializeUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user ? await user.verifyPassword(password) : false;

  if (!valid) {
    throw new AppError(401, 'Email or password is incorrect.');
  }

  res.json({ token: signToken(user), user: serializeUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ user: serializeUser(req.user) });
});
