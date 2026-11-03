import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { recordAuditLog } from '../utils/audit.js';

export class BootstrapService {
  /**
   * Idempotently bootstraps the initial Super Admin account from environment variables.
   * If a Super Admin with ADMIN_EMAIL already exists, does nothing.
   * Does NOT recreate or overwrite password on restart.
   */
  static async bootstrapAdmin(): Promise<void> {
    try {
      const adminEmail = (config.admin?.email || process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
      const adminPassword = config.admin?.password || process.env.ADMIN_PASSWORD || 'Admin@SecurePassword123';

      // 1. Ensure SUPER_ADMIN role exists
      let superAdminRole = await prisma.role.findFirst({
        where: { name: 'SUPER_ADMIN' },
      });

      if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
          data: {
            name: 'SUPER_ADMIN',
            description: 'Full administrator access to all CRM functions',
          },
        });

        // Ensure permission exists
        let allPerm = await prisma.permission.findUnique({
          where: { code: 'ALL' },
        });
        if (!allPerm) {
          allPerm = await prisma.permission.create({
            data: { code: 'ALL', name: 'All Permissions', description: 'Full system access' },
          });
        }

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: allPerm.id,
            },
          },
          update: {},
          create: {
            roleId: superAdminRole.id,
            permissionId: allPerm.id,
          },
        });
      }

      // 2. Check if Super Admin with this email already exists
      const existingAdmin = await prisma.user.findFirst({
        where: {
          OR: [
            { email: adminEmail },
            { role: 'SUPER_ADMIN' },
          ],
        },
      });

      if (existingAdmin) {
        // If an admin exists with a different email, ensure the configured ADMIN_EMAIL also exists or is updated
        if (existingAdmin.email.toLowerCase() !== adminEmail) {
          const emailCheck = await prisma.user.findUnique({ where: { email: adminEmail } });
          if (!emailCheck) {
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            await prisma.user.create({
              data: {
                name: 'Super Admin',
                email: adminEmail,
                passwordHash,
                role: 'SUPER_ADMIN',
                roleId: superAdminRole.id,
                status: 'ACTIVE',
              },
            });
            logger.info(`Initial Super Admin provisioned for ${adminEmail}`);
          }
        } else {
          logger.info(`Super Admin account already exists for ${adminEmail} (bootstrap skipped)`);
        }
        return;
      }

      // 3. Create initial Super Admin from environment variables
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const newAdmin = await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: adminEmail,
          passwordHash,
          role: 'SUPER_ADMIN',
          roleId: superAdminRole.id,
          status: 'ACTIVE',
        },
      });

      await recordAuditLog({
        entityType: 'User',
        entityId: newAdmin.id,
        action: 'SUPER_ADMIN_BOOTSTRAPPED',
        performedById: newAdmin.id,
        details: { email: adminEmail, source: 'ENVIRONMENT_BOOTSTRAP' },
      });

      logger.info(`✓ Successfully provisioned initial Super Admin account (${adminEmail})`);
    } catch (error: any) {
      logger.error('Failed to bootstrap Super Admin account:', error);
    }
  }

  /**
   * Safely cleans up demo users (Ravi, Priya, Arjun, Rohan, Elena) and reassigns any linked tickets.
   */
  static async cleanupDemoUsers(): Promise<{ cleanedUsers: string[]; reallocatedTickets: number }> {
    const demoEmails = [
      'ravi@crm.local',
      'priya@crm.local',
      'arjun@crm.local',
      'accountant@crm.local',
      'elena.manager@crm.local',
    ];

    const demoUsers = await prisma.user.findMany({
      where: {
        email: { in: demoEmails },
      },
      include: {
        agentProfile: true,
      },
    });

    if (demoUsers.length === 0) {
      return { cleanedUsers: [], reallocatedTickets: 0 };
    }

    const demoAgentIds = demoUsers
      .map((u) => u.agentProfile?.id)
      .filter((id): id is string => Boolean(id));

    // 1. Unassign tickets that were assigned to demo agents so tickets are preserved
    const updateResult = await prisma.ticket.updateMany({
      where: {
        assignedAgentId: { in: demoAgentIds },
      },
      data: {
        assignedAgentId: null,
      },
    });

    // 2. Clean up demo assignments & time entries
    await prisma.ticketAssignment.deleteMany({
      where: {
        OR: [
          { previousAgentId: { in: demoAgentIds } },
          { newAgentId: { in: demoAgentIds } },
        ],
      },
    });

    await prisma.supportTimeEntry.deleteMany({
      where: {
        agentId: { in: demoAgentIds },
      },
    });

    await prisma.extraHourRecord.deleteMany({
      where: {
        agentId: { in: demoAgentIds },
      },
    });

    // 3. Remove demo agents and users
    await prisma.agent.deleteMany({
      where: {
        id: { in: demoAgentIds },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: demoUsers.map((u) => u.id) },
      },
    });

    logger.info(`Cleaned up ${demoUsers.length} demo users and unassigned ${updateResult.count} tickets`);
    return {
      cleanedUsers: demoUsers.map((u) => u.email),
      reallocatedTickets: updateResult.count,
    };
  }
}
