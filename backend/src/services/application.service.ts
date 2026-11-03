import { prisma } from '../config/db.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { recordAuditLog } from '../utils/audit.js';

export class ApplicationService {
  static async listApplications() {
    return prisma.application.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            tickets: true,
            customers: true,
          },
        },
      },
    });
  }

  static async getApplicationById(id: string) {
    const app = await prisma.application.findUnique({
      where: { id },
      include: {
        categories: true,
        assignmentRules: {
          include: { team: true },
        },
        _count: {
          select: {
            tickets: true,
            customers: true,
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundError(`Application with ID ${id} not found`);
    }

    return app;
  }

  static async findBySupportEmail(email: string) {
    const normalized = email.toLowerCase().trim();
    return prisma.application.findFirst({
      where: {
        supportEmail: { equals: normalized, mode: 'insensitive' },
        status: 'ACTIVE',
      },
    });
  }

  static async createApplication(data: {
    name: string;
    code: string;
    description?: string | null;
    supportEmail: string;
    logoUrl?: string | null;
  }, userId?: string) {
    const code = data.code.toUpperCase().trim();
    const supportEmail = data.supportEmail.toLowerCase().trim();

    const existingCode = await prisma.application.findUnique({ where: { code } });
    if (existingCode) {
      throw new ConflictError(`Application with code '${code}' already exists`);
    }

    const existingEmail = await prisma.application.findUnique({ where: { supportEmail } });
    if (existingEmail) {
      throw new ConflictError(`Application with support email '${supportEmail}' already exists`);
    }

    const app = await prisma.application.create({
      data: {
        name: data.name.trim(),
        code,
        description: data.description?.trim() || null,
        supportEmail,
        logoUrl: data.logoUrl || null,
      },
    });

    await recordAuditLog({
      entityType: 'Application',
      entityId: app.id,
      action: 'APPLICATION_CREATED',
      performedById: userId,
      details: { name: app.name, code: app.code, supportEmail: app.supportEmail },
    });

    return app;
  }

  static async updateApplication(id: string, data: {
    name?: string;
    description?: string | null;
    supportEmail?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    logoUrl?: string | null;
  }, userId?: string) {
    await this.getApplicationById(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl || null;

    if (data.supportEmail !== undefined) {
      const email = data.supportEmail.toLowerCase().trim();
      const existing = await prisma.application.findFirst({
        where: {
          supportEmail: email,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictError(`Support email '${email}' is already in use by another application`);
      }
      updateData.supportEmail = email;
    }

    const updated = await prisma.application.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      entityType: 'Application',
      entityId: id,
      action: 'APPLICATION_UPDATED',
      performedById: userId,
      details: data,
    });

    return updated;
  }
}
