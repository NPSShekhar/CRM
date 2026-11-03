import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export class AgentService {
  static async createAgent(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    teamId?: string | null;
    maxCapacity?: number;
    skills?: string[];
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const email = data.email.toLowerCase().trim();
    if (!data.name?.trim()) {
      throw new BadRequestError('Agent name is required');
    }
    if (!email) {
      throw new BadRequestError('Agent email is required');
    }
    if (!data.password || data.password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestError(`User with email "${email}" already exists`);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const userStatus = data.status || 'ACTIVE';

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email,
          passwordHash,
          phone: data.phone || null,
          role: 'AGENT',
          status: userStatus,
        },
      });

      const agent = await tx.agent.create({
        data: {
          userId: user.id,
          teamId: data.teamId || null,
          maxCapacity: data.maxCapacity ?? 15,
          skills: data.skills || [],
          isAvailable: userStatus === 'ACTIVE',
          currentLoad: 0,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              phone: true,
              createdAt: true,
            },
          },
          team: true,
        },
      });

      return agent;
    });
  }

  static async listAgents(teamId?: string) {
    const where: any = {};
    if (teamId) where.teamId = teamId;

    return prisma.agent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
        team: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            ticketsAssigned: {
              where: {
                status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getAgentById(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
        team: true,
        ticketsAssigned: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            customer: true,
            application: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundError(`Agent with ID ${id} not found`);
    }

    return agent;
  }

  static async updateAgent(id: string, data: {
    name?: string;
    phone?: string;
    teamId?: string | null;
    isAvailable?: boolean;
    maxCapacity?: number;
    skills?: string[];
    status?: 'ACTIVE' | 'INACTIVE';
  }) {
    const agent = await this.getAgentById(id);

    if (data.name || data.phone !== undefined || data.status) {
      await prisma.user.update({
        where: { id: agent.userId },
        data: {
          ...(data.name ? { name: data.name.trim() } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.status ? { status: data.status } : {}),
        },
      });
    }

    const agentUpdate: any = {};
    if (data.teamId !== undefined) agentUpdate.teamId = data.teamId;
    if (data.isAvailable !== undefined) agentUpdate.isAvailable = data.isAvailable;
    if (data.maxCapacity !== undefined) agentUpdate.maxCapacity = data.maxCapacity;
    if (data.skills !== undefined) agentUpdate.skills = data.skills;

    return prisma.agent.update({
      where: { id },
      data: agentUpdate,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
        team: true,
      },
    });
  }

  static async toggleStatus(agentId: string, status: 'ACTIVE' | 'INACTIVE') {
    const agent = await this.getAgentById(agentId);
    const isAvailable = status === 'ACTIVE' ? agent.isAvailable : false;

    await prisma.user.update({
      where: { id: agent.userId },
      data: { status },
    });

    return prisma.agent.update({
      where: { id: agentId },
      data: { isAvailable },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
        team: true,
      },
    });
  }

  static async resetPassword(agentId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }
    const agent = await this.getAgentById(agentId);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: agent.userId },
      data: { passwordHash },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  static async refreshAgentLoads(): Promise<void> {
    const agents = await prisma.agent.findMany();
    for (const agent of agents) {
      const activeCount = await prisma.ticket.count({
        where: {
          assignedAgentId: agent.id,
          status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
        },
      });
      await prisma.agent.update({
        where: { id: agent.id },
        data: { currentLoad: activeCount },
      });
    }
  }

  static async getAgentWorkloadSummary() {
    const agents = await this.listAgents();
    return agents.map((agent) => ({
      agentId: agent.id,
      name: agent.user.name,
      email: agent.user.email,
      team: agent.team?.name || 'Unassigned',
      status: agent.user.status,
      isAvailable: agent.isAvailable,
      maxCapacity: agent.maxCapacity,
      currentLoad: agent._count.ticketsAssigned,
      capacityPercentage: Math.min(100, Math.round((agent._count.ticketsAssigned / (agent.maxCapacity || 1)) * 100)),
      createdAt: agent.user.createdAt,
    }));
  }
}
