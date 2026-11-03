import { prisma } from '../config/db.js';
import { recordAuditLog } from '../utils/audit.js';
import { NotFoundError } from '../utils/errors.js';
import nodemailer from 'nodemailer';

export class SettingsService {
  static async getEmailSettings() {
    const config = await prisma.emailConfiguration.findFirst({
      where: { isDefault: true },
    });

    if (!config) {
      return {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        username: process.env.SMTP_USER || '',
        passwordMasked: process.env.SMTP_PASSWORD ? '••••••••••••' : '',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'support@crm.local',
        fromName: process.env.SMTP_FROM_NAME || 'Enterprise CRM Support',
        encryption: 'STARTTLS',
        isConfigured: !!process.env.SMTP_USER,
      };
    }

    return {
      id: config.id,
      host: config.host,
      port: config.port,
      username: config.username,
      passwordMasked: config.passwordEncrypted ? '••••••••••••' : '',
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      encryption: config.encryption,
      isConfigured: true,
    };
  }

  static async updateEmailSettings(data: {
    host: string;
    port: number;
    username: string;
    password?: string;
    fromEmail: string;
    fromName: string;
    encryption: string;
  }, userId?: string) {
    const existing = await prisma.emailConfiguration.findFirst({
      where: { isDefault: true },
    });

    let config;
    if (existing) {
      config = await prisma.emailConfiguration.update({
        where: { id: existing.id },
        data: {
          host: data.host,
          port: data.port,
          username: data.username,
          ...(data.password ? { passwordEncrypted: data.password } : {}),
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          encryption: data.encryption,
        },
      });
    } else {
      config = await prisma.emailConfiguration.create({
        data: {
          host: data.host,
          port: data.port,
          username: data.username,
          passwordEncrypted: data.password || '',
          fromEmail: data.fromEmail,
          fromName: data.fromName,
          encryption: data.encryption,
          isDefault: true,
          isActive: true,
        },
      });
    }

    await recordAuditLog({
      entityType: 'EmailConfiguration',
      entityId: config.id,
      action: 'EMAIL_SETTINGS_UPDATED',
      performedById: userId,
      details: { host: config.host, port: config.port, fromEmail: config.fromEmail },
    });

    return this.getEmailSettings();
  }

  static async testSmtpConnection(data: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    fromEmail: string;
  }) {
    const transporter = nodemailer.createTransport({
      host: data.host,
      port: data.port,
      secure: data.port === 465,
      auth: data.username && data.password ? {
        user: data.username,
        pass: data.password,
      } : undefined,
    });

    try {
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (err: any) {
      return { success: false, message: err.message || 'SMTP connection failed' };
    }
  }

  static async listAssignmentRules() {
    return prisma.assignmentRule.findMany({
      include: {
        application: true,
        team: true,
      },
      orderBy: { priority: 'asc' },
    });
  }

  static async createAssignmentRule(data: {
    name: string;
    applicationId: string;
    strategy: 'ROUND_ROBIN' | 'LEAST_ASSIGNED' | 'APPLICATION_BASED' | 'TEAM_BASED' | 'MANUAL';
    teamId?: string | null;
    isActive?: boolean;
    priority?: number;
  }, userId?: string) {
    const rule = await prisma.assignmentRule.create({
      data: {
        name: data.name,
        applicationId: data.applicationId,
        strategy: data.strategy,
        teamId: data.teamId || null,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 1,
      },
      include: {
        application: true,
        team: true,
      },
    });

    await recordAuditLog({
      entityType: 'AssignmentRule',
      entityId: rule.id,
      action: 'ASSIGNMENT_RULE_CREATED',
      performedById: userId,
      details: { name: rule.name, strategy: rule.strategy },
    });

    return rule;
  }

  static async updateAssignmentRule(id: string, data: any, userId?: string) {
    const rule = await prisma.assignmentRule.update({
      where: { id },
      data,
      include: {
        application: true,
        team: true,
      },
    });

    await recordAuditLog({
      entityType: 'AssignmentRule',
      entityId: rule.id,
      action: 'ASSIGNMENT_RULE_UPDATED',
      performedById: userId,
      details: data,
    });

    return rule;
  }

  static async deleteAssignmentRule(id: string, userId?: string) {
    await prisma.assignmentRule.delete({ where: { id } });
    await recordAuditLog({
      entityType: 'AssignmentRule',
      entityId: id,
      action: 'ASSIGNMENT_RULE_DELETED',
      performedById: userId,
    });
    return { success: true };
  }
}
