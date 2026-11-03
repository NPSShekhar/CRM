import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { config } from '../config/index.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';
import { UserRole } from '@prisma/client';
import { recordAuditLog } from '../utils/audit.js';

export class AuthService {
  static async login(email: string, password: string, ipAddress?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        agentProfile: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is inactive or suspended');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    await recordAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: 'LOGIN',
      performedById: user.id,
      details: { email: user.email, role: user.role },
      ipAddress,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        agentId: user.agentProfile?.id || null,
        team: user.agentProfile?.team ? { id: user.agentProfile.team.id, name: user.agentProfile.team.name } : null,
      },
    };
  }

  static async register(data: { name: string; email: string; password: string; role?: UserRole }) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const role = data.role || UserRole.AGENT;

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
      },
    });

    if (role === UserRole.AGENT) {
      await prisma.agent.create({
        data: {
          userId: user.id,
          maxCapacity: 15,
          currentLoad: 0,
          isAvailable: true,
        },
      });
    }

    await recordAuditLog({
      entityType: 'User',
      entityId: user.id,
      action: 'USER_REGISTERED',
      performedById: user.id,
      details: { email: user.email, role: user.role },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agentProfile: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      agentId: user.agentProfile?.id || null,
      team: user.agentProfile?.team ? { id: user.agentProfile.team.id, name: user.agentProfile.team.name } : null,
    };
  }
}
