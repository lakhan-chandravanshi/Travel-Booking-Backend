import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { User } from '../models/User.js';

function authResponse(res, user, statusCode = 200) {
  const token = signToken({ sub: user._id.toString() });
  res.status(statusCode).json({
    success: true,
    data: { user, token },
  });
}

// POST /api/v1/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = await User.create({ name, email, password });
  authResponse(res, user, 201);
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  authResponse(res, user);
});

// GET /api/v1/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
