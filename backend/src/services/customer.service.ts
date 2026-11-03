import { prisma } from '../config/db.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors.js';
import { recordAuditLog } from '../utils/audit.js';

export class CustomerService {
  static async generateCustomerCode(): Promise<string> {
    const count = await prisma.customer.count();
    const nextNum = count + 1;
    return `CUST-${String(nextNum).padStart(6, '0')}`;
  }

  static async listCustomers(params: {
    search?: string;
    applicationId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { customerCode: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.applicationId) {
      where.applications = {
        some: {
          applicationId: params.applicationId,
        },
      };
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          applications: {
            include: { application: true },
          },
          memberships: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
          },
          _count: {
            select: { tickets: true },
          },
        },
      }),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        applications: {
          include: { application: true },
        },
        memberships: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        timeEntries: {
          include: {
            agent: { include: { user: true } },
            ticket: { select: { id: true, ticketNumber: true, subject: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        extraHours: {
          include: {
            agent: { include: { user: true } },
            ticket: { select: { id: true, ticketNumber: true, subject: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          include: {
            application: true,
            assignedAgent: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  static async createCustomer(data: {
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    applicationIds?: string[];
  }, creatorUserId?: string) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existing = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError(`Customer with email ${normalizedEmail} already exists`);
    }

    const customerCode = await this.generateCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone?.trim() || null,
        company: data.company?.trim() || null,
        applications: data.applicationIds && data.applicationIds.length > 0 ? {
          create: data.applicationIds.map((appId) => ({
            applicationId: appId,
          })),
        } : undefined,
      },
      include: {
        applications: {
          include: { application: true },
        },
      },
    });

    await recordAuditLog({
      entityType: 'Customer',
      entityId: customer.id,
      action: 'CUSTOMER_CREATED',
      performedById: creatorUserId,
      details: { email: customer.email, customerCode: customer.customerCode },
    });

    return customer;
  }

  static async findOrCreateCustomer(email: string, name?: string, applicationId?: string): Promise<{ id: string; email: string; name: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    let customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (!customer) {
      const customerCode = await this.generateCustomerCode();
      const customerName = name?.trim() || normalizedEmail.split('@')[0];

      customer = await prisma.customer.create({
        data: {
          customerCode,
          name: customerName,
          email: normalizedEmail,
          lastContactedAt: new Date(),
        },
      });

      await recordAuditLog({
        entityType: 'Customer',
        entityId: customer.id,
        action: 'CUSTOMER_AUTO_CREATED_FROM_EMAIL',
        details: { email: customer.email, customerCode: customer.customerCode },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastContactedAt: new Date() },
      });
    }

    if (applicationId) {
      await prisma.customerApplication.upsert({
        where: {
          customerId_applicationId: {
            customerId: customer.id,
            applicationId,
          },
        },
        create: {
          customerId: customer.id,
          applicationId,
        },
        update: {},
      });
    }

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    };
  }

  static async updateCustomer(id: string, data: {
    name?: string;
    phone?: string | null;
    company?: string | null;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    applicationIds?: string[];
  }, updaterUserId?: string) {
    await this.getCustomerById(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.company !== undefined) updateData.company = data.company?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.applicationIds !== undefined) {
      await prisma.customerApplication.deleteMany({
        where: { customerId: id },
      });
      if (data.applicationIds.length > 0) {
        updateData.applications = {
          create: data.applicationIds.map((appId) => ({
            applicationId: appId,
          })),
        };
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
      include: {
        applications: {
          include: { application: true },
        },
      },
    });

    await recordAuditLog({
      entityType: 'Customer',
      entityId: id,
      action: 'CUSTOMER_UPDATED',
      performedById: updaterUserId,
      details: data,
    });

    return updated;
  }
}
