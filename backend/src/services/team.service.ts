import { prisma } from '../config/db.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

export class TeamService {
  static async listTeams() {
    return prisma.team.findMany({
      include: {
        lead: {
          select: { id: true, name: true, email: true },
        },
        agents: {
          include: {
            user: {
              select: { id: true, name: true, email: true, status: true },
            },
          },
        },
        _count: {
          select: { tickets: true, agents: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getTeamById(id: string) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        lead: {
          select: { id: true, name: true, email: true },
        },
        agents: {
          include: {
            user: { select: { id: true, name: true, email: true, status: true, avatarUrl: true } },
          },
        },
        tickets: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!team) {
      throw new NotFoundError(`Team with ID ${id} not found`);
    }

    return team;
  }

  static async createTeam(data: { name: string; description?: string | null; leadId?: string | null }) {
    const name = data.name.trim();
    const existing = await prisma.team.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictError(`Team with name '${name}' already exists`);
    }

    return prisma.team.create({
      data: {
        name,
        description: data.description?.trim() || null,
        leadId: data.leadId || null,
      },
    });
  }

  static async updateTeam(id: string, data: { name?: string; description?: string | null; leadId?: string | null }) {
    await this.getTeamById(id);

    const updateData: any = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      const existing = await prisma.team.findFirst({
        where: { name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictError(`Team with name '${name}' already exists`);
      }
      updateData.name = name;
    }
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.leadId !== undefined) updateData.leadId = data.leadId || null;

    return prisma.team.update({
      where: { id },
      data: updateData,
    });
  }
}
