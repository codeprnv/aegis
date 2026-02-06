import {
  ConflictError,
  generateAccessToken,
  generateRefreshToken,
  hashPassword,
  UnauthorizedError,
  verifyPassword,
  verifyRefreshToken,
} from '@aegis/common';
import { prisma } from '@aegis/database';
import type { LoginUserInput } from '../types/loginTypes';
import { AuthResponse, RegisterUserInput } from '../types/registrationTypes';

/**
 * Register a new user
 */
export const registerUser = async (
  input: RegisterUserInput
): Promise<AuthResponse> => {
  const { username, email, password, mobile } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ConflictError('A user with this email already exists');
    }
    throw new ConflictError('A user with this username already exists');
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create the user
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      mobile: mobile || null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
};

export const loginUser = async (
  input: LoginUserInput
): Promise<AuthResponse> => {
  const { email, password } = input;

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      mobile: true,
      role: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = generateAccessToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  const refreshToken = generateRefreshToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    accessToken: accessToken,
    refreshToken: refreshToken,
    createdAt: user.createdAt,
  };
};

export const refreshTokenService = async (
  token: string
): Promise<AuthResponse> => {
  // Verify token
  const decoded = verifyRefreshToken(token);

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const accessToken = generateAccessToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  const refreshToken = generateRefreshToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    accessToken,
    refreshToken,
    createdAt: user.createdAt,
  };
};
