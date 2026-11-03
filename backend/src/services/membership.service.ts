import { prisma } from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { recordAuditLog } from '../utils/audit.js';

export class MembershipService {
  /**
   * List all available membership plans.
   */
  static async listPlans() {
    return prisma.membershipPlan.findMany({
      orderBy: { includedHours: 'asc' },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });
  }

  /**
   * Get plan by ID.
   */
  static async getPlanById(id: string) {
    const plan = await prisma.membershipPlan.findUnique({
      where: { id },
    });
    if (!plan) throw new NotFoundError('Membership plan not found');
    return plan;
  }

  /**
   * Create a new membership plan.
   */
  static async createPlan(data: {
    name: string;
    description?: string;
    includedHours: number;
    validityDays?: number;
    price?: number;
    extraHourRate?: number;
    isActive?: boolean;
  }) {
    const existing = await prisma.membershipPlan.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new BadRequestError(`Plan with name "${data.name}" already exists`);
    }

    return prisma.membershipPlan.create({
      data: {
        name: data.name,
        description: data.description,
        includedHours: data.includedHours,
        validityDays: data.validityDays ?? 365,
        price: data.price ?? 0,
        extraHourRate: data.extraHourRate ?? 1500,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Update an existing plan.
   */
  static async updatePlan(
    id: string,
    data: {
      name?: string;
      description?: string;
      includedHours?: number;
      validityDays?: number;
      price?: number;
      extraHourRate?: number;
      isActive?: boolean;
    }
  ) {
    await this.getPlanById(id);
    return prisma.membershipPlan.update({
      where: { id },
      data,
    });
  }

  /**
   * Assign or upgrade a customer's membership plan.
   */
  static async assignCustomerMembership(params: {
    customerId: string;
    planId: string;
    customHours?: number;
    validityDays?: number;
    performedById?: string;
  }) {
    const customer = await prisma.customer.findUnique({
      where: { id: params.customerId },
    });
    if (!customer) throw new NotFoundError('Customer not found');

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: params.planId },
    });
    if (!plan) throw new NotFoundError('Membership plan not found');

    const totalHours = params.customHours ?? plan.includedHours;
    const validity = params.validityDays ?? plan.validityDays;
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validity);

    // Deactivate previous active memberships for this customer
    await prisma.customerMembership.updateMany({
      where: {
        customerId: customer.id,
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const membership = await prisma.customerMembership.create({
      data: {
        customerId: customer.id,
        planId: plan.id,
        totalHours,
        usedHours: 0,
        remainingHours: totalHours,
        startDate,
        expiryDate,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    await recordAuditLog({
      entityType: 'CustomerMembership',
      entityId: membership.id,
      action: 'MEMBERSHIP_ASSIGNED',
      performedById: params.performedById,
      details: {
        customerId: customer.id,
        planName: plan.name,
        totalHours,
        expiryDate,
      },
    });

    return membership;
  }

  /**
   * Get active membership and all memberships for a customer.
   */
  static async getCustomerMemberships(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundError('Customer not found');

    const memberships = await prisma.customerMembership.findMany({
      where: { customerId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const activeMembership = memberships.find(
      (m) => m.status === 'ACTIVE' && new Date(m.expiryDate) > new Date()
    ) || null;

    return {
      memberships,
      activeMembership,
    };
  }
}
