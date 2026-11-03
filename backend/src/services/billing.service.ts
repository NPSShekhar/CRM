import { prisma } from '../config/db.js';
import { BillingStatus } from '@prisma/client';
import { NotFoundError } from '../utils/errors.js';
import { recordAuditLog } from '../utils/audit.js';

export interface BillingFilterParams {
  customerId?: string;
  status?: BillingStatus;
  startDate?: string;
  endDate?: string;
  agentId?: string;
  page?: number;
  limit?: number;
}

export class BillingService {
  /**
   * List all extra-hours billing records with pagination and filters.
   */
  static async listExtraHourRecords(params: BillingFilterParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.status) where.status = params.status;
    if (params.agentId) where.agentId = params.agentId;
    if (params.startDate || params.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = new Date(params.startDate);
      if (params.endDate) where.date.lte = new Date(params.endDate);
    }

    const [total, records] = await Promise.all([
      prisma.extraHourRecord.count({ where }),
      prisma.extraHourRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          customer: true,
          ticket: {
            select: { id: true, ticketNumber: true, subject: true },
          },
          agent: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          membership: {
            include: { plan: true },
          },
        },
      }),
    ]);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Accountant high-level dashboard metrics.
   */
  static async getAccountantSummary() {
    const [
      totalCustomers,
      allTimeEntries,
      extraRecords,
      allMemberships,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.supportTimeEntry.findMany({
        select: { durationHours: true, includedHoursUsed: true, extraHoursUsed: true },
      }),
      prisma.extraHourRecord.findMany({
        include: {
          customer: true,
          ticket: true,
          agent: { include: { user: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.customerMembership.findMany({
        where: { status: 'ACTIVE' },
        select: { usedHours: true, totalHours: true, remainingHours: true },
      }),
    ]);

    const totalSupportHours = Math.round(allTimeEntries.reduce((acc, t) => acc + t.durationHours, 0) * 100) / 100;
    const includedHoursUsed = Math.round(allTimeEntries.reduce((acc, t) => acc + t.includedHoursUsed, 0) * 100) / 100;
    const extraHours = Math.round(extraRecords.reduce((acc, r) => acc + r.durationHours, 0) * 100) / 100;
    const totalExtraBilling = extraRecords.reduce((acc, r) => acc + r.amount, 0);

    const pendingAmount = extraRecords
      .filter((r) => r.status === 'PENDING')
      .reduce((acc, r) => acc + r.amount, 0);

    const invoicedAmount = extraRecords
      .filter((r) => r.status === 'INVOICED')
      .reduce((acc, r) => acc + r.amount, 0);

    const paidAmount = extraRecords
      .filter((r) => r.status === 'PAID')
      .reduce((acc, r) => acc + r.amount, 0);

    return {
      totalCustomers,
      totalSupportHours,
      includedHoursUsed,
      extraHours,
      totalExtraBilling,
      pendingAmount,
      invoicedAmount,
      paidAmount,
      records: extraRecords,
    };
  }

  /**
   * Update billing status of an extra-hour record.
   */
  static async updateBillingStatus(params: {
    recordId: string;
    status: BillingStatus;
    notes?: string;
    performedById?: string;
  }) {
    const record = await prisma.extraHourRecord.findUnique({
      where: { id: params.recordId },
    });

    if (!record) throw new NotFoundError('Billing record not found');

    const updated = await prisma.extraHourRecord.update({
      where: { id: params.recordId },
      data: {
        status: params.status,
        ...(params.notes ? { notes: params.notes } : {}),
      },
      include: {
        customer: true,
        ticket: true,
        agent: { include: { user: true } },
      },
    });

    await recordAuditLog({
      entityType: 'ExtraHourRecord',
      entityId: record.id,
      action: 'BILLING_STATUS_UPDATED',
      performedById: params.performedById,
      details: {
        previousStatus: record.status,
        newStatus: params.status,
        amount: record.amount,
      },
    });

    return updated;
  }

  /**
   * Generate CSV content for Accountant export.
   */
  static async generateCsvExport(filters: BillingFilterParams): Promise<string> {
    const where: any = {};
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
    if (filters.agentId) where.agentId = filters.agentId;

    const records = await prisma.extraHourRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        customer: true,
        ticket: true,
        agent: { include: { user: true } },
      },
    });

    const headers = [
      'Record ID',
      'Date',
      'Customer Code',
      'Customer Name',
      'Customer Email',
      'Company',
      'Ticket Number',
      'Ticket Subject',
      'Agent Name',
      'Extra Hours',
      'Hourly Rate (INR)',
      'Total Amount (INR)',
      'Billing Status',
      'Notes',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${new Date(r.date).toISOString().split('T')[0]}"`,
      `"${r.customer.customerCode}"`,
      `"${r.customer.name.replace(/"/g, '""')}"`,
      `"${r.customer.email}"`,
      `"${(r.customer.company || '').replace(/"/g, '""')}"`,
      `"${r.ticket.ticketNumber}"`,
      `"${r.ticket.subject.replace(/"/g, '""')}"`,
      `"${r.agent.user.name.replace(/"/g, '""')}"`,
      r.durationHours.toFixed(2),
      r.hourlyRate.toFixed(2),
      r.amount.toFixed(2),
      `"${r.status}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
