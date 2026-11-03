import { PrismaClient, UserRole, UserStatus, TicketPriority, TicketStatus, TicketSource } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CRM database seeding...');

  // Clean existing records in reverse dependency order
  await prisma.extraHourRecord.deleteMany();
  await prisma.supportTimeEntry.deleteMany();
  await prisma.customerMembership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.emailMessage.deleteMany();
  await prisma.emailThread.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticketAssignment.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.assignmentRule.deleteMany();
  await prisma.customerApplication.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.team.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.application.deleteMany();
  await prisma.emailConfiguration.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  // 0. Seed Roles and Permissions
  const permAll = await prisma.permission.create({
    data: { code: 'ALL', name: 'All Permissions', description: 'Full system access' },
  });
  const permTicketsView = await prisma.permission.create({
    data: { code: 'TICKETS_VIEW_ALL', name: 'View All Tickets', description: 'Can view tickets across all queues' },
  });
  const permTicketsAssign = await prisma.permission.create({
    data: { code: 'TICKETS_ASSIGN', name: 'Assign Tickets', description: 'Can assign tickets to agents' },
  });
  const permTicketsReply = await prisma.permission.create({
    data: { code: 'TICKETS_REPLY', name: 'Reply to Tickets', description: 'Can send messages to customers' },
  });
  const permAgentsManage = await prisma.permission.create({
    data: { code: 'AGENTS_MANAGE', name: 'Manage Agents', description: 'Can view and configure agents' },
  });
  const permTeamsManage = await prisma.permission.create({
    data: { code: 'TEAMS_MANAGE', name: 'Manage Teams', description: 'Can view and configure teams' },
  });
  const permReportsView = await prisma.permission.create({
    data: { code: 'REPORTS_VIEW', name: 'View Reports', description: 'Can view executive and SLA analytics' },
  });

  const superAdminRole = await prisma.role.create({
    data: { name: 'SUPER_ADMIN', description: 'Full administrator access to all CRM functions' },
  });
  await prisma.rolePermission.create({
    data: { roleId: superAdminRole.id, permissionId: permAll.id },
  });

  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'Organization administrator' },
  });
  for (const p of [permAll, permTicketsView, permTicketsAssign, permTicketsReply, permAgentsManage, permTeamsManage, permReportsView]) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: p.id },
    });
  }

  const supportManagerRole = await prisma.role.create({
    data: { name: 'SUPPORT_MANAGER', description: 'Support team and workload manager' },
  });
  for (const p of [permTicketsView, permTicketsAssign, permTicketsReply, permAgentsManage, permTeamsManage, permReportsView]) {
    await prisma.rolePermission.create({
      data: { roleId: supportManagerRole.id, permissionId: p.id },
    });
  }

  const agentRole = await prisma.role.create({
    data: { name: 'AGENT', description: 'Customer support representative' },
  });
  await prisma.rolePermission.create({
    data: { roleId: agentRole.id, permissionId: permTicketsReply.id },
  });

  const accountantRole = await prisma.role.create({
    data: { name: 'ACCOUNTANT', description: 'Financial & support hours billing accountant' },
  });
  await prisma.rolePermission.create({
    data: { roleId: accountantRole.id, permissionId: permReportsView.id },
  });

  // 1. Create Super Admin from Environment Variables
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  const adminRawPassword = process.env.ADMIN_PASSWORD || 'Admin@SecurePassword123';
  const adminPasswordHash = await bcrypt.hash(adminRawPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      roleId: superAdminRole.id,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`✓ Seeded Super Admin (${adminEmail})`);

  // 2. Create Teams
  const techTeam = await prisma.team.create({
    data: {
      name: 'Tier 1 Support Team',
      description: 'First response team for core software and integration questions',
      leadId: admin.id,
    },
  });

  const enterpriseTeam = await prisma.team.create({
    data: {
      name: 'Enterprise Escalations',
      description: 'Handles critical bugs, hospital systems, and enterprise SLA issues',
      leadId: admin.id,
    },
  });

  // 3. Create Applications
  const appSkillBridge = await prisma.application.create({
    data: {
      name: 'SkillBridge',
      code: 'SKILLBRIDGE',
      description: 'Online learning platform and university course management portal',
      supportEmail: 'support@skillbridge.com',
      status: UserStatus.ACTIVE,
    },
  });

  const appWings = await prisma.application.create({
    data: {
      name: 'Wings',
      code: 'WINGS',
      description: 'Fleet logistics and last-mile flight delivery coordinator',
      supportEmail: 'support@wings.com',
      status: UserStatus.ACTIVE,
    },
  });

  const appBizOne = await prisma.application.create({
    data: {
      name: 'BizOne',
      code: 'BIZONE',
      description: 'SME ERP & accounting platform for inventory and tax compliance',
      supportEmail: 'support@bizone.com',
      status: UserStatus.ACTIVE,
    },
  });

  const appSusruta = await prisma.application.create({
    data: {
      name: 'Susruta Hospital',
      code: 'SUSRUTA',
      description: 'Multi-specialty hospital management and patient records portal',
      supportEmail: 'support@susrutahospital.com',
      status: UserStatus.ACTIVE,
    },
  });

  // 4. Create Customers
  const customerJohn = await prisma.customer.create({
    data: {
      customerCode: 'CUST-000001',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0192',
      company: 'Apex Learning Group',
      status: UserStatus.ACTIVE,
      lastContactedAt: new Date(),
    },
  });

  const customerSarah = await prisma.customer.create({
    data: {
      customerCode: 'CUST-000002',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@techcorp.io',
      phone: '+1-555-8391',
      company: 'TechCorp International',
      status: UserStatus.ACTIVE,
      lastContactedAt: new Date(Date.now() - 3600 * 1000 * 24),
    },
  });

  const customerDrMehta = await prisma.customer.create({
    data: {
      customerCode: 'CUST-000003',
      name: 'Dr. Rajesh Mehta',
      email: 'rmehta@citycare.org',
      phone: '+91-98200-11223',
      company: 'CityCare Medical Centre',
      status: UserStatus.ACTIVE,
      lastContactedAt: new Date(Date.now() - 3600 * 1000 * 12),
    },
  });

  // Customer application associations
  await prisma.customerApplication.createMany({
    data: [
      { customerId: customerJohn.id, applicationId: appSkillBridge.id },
      { customerId: customerSarah.id, applicationId: appBizOne.id },
      { customerId: customerSarah.id, applicationId: appWings.id },
      { customerId: customerDrMehta.id, applicationId: appSusruta.id },
    ],
  });

  // 5. Seed Membership Plans & Customer Memberships
  const standardPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Standard Support',
      description: '25 hours of comprehensive enterprise support per year',
      includedHours: 25,
      price: 35000,
      extraHourRate: 1500,
      validityDays: 365,
    },
  });

  const premiumPlan = await prisma.membershipPlan.create({
    data: {
      name: 'Premium Support',
      description: '50 hours of dedicated priority support and architectural consulting',
      includedHours: 50,
      price: 65000,
      extraHourRate: 1500,
      validityDays: 365,
    },
  });

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // John Doe with Premium Support: 20h included, 18h used, 2h remaining
  await prisma.customerMembership.create({
    data: {
      customerId: customerJohn.id,
      planId: premiumPlan.id,
      totalHours: 20,
      usedHours: 18,
      remainingHours: 2,
      startDate: new Date(),
      expiryDate: oneYearFromNow,
      status: 'ACTIVE',
    },
  });

  // Sarah Jenkins with Standard Support: 25h total, 10h used, 15h remaining
  await prisma.customerMembership.create({
    data: {
      customerId: customerSarah.id,
      planId: standardPlan.id,
      totalHours: 25,
      usedHours: 10,
      remainingHours: 15,
      startDate: new Date(),
      expiryDate: oneYearFromNow,
      status: 'ACTIVE',
    },
  });

  // 6. Seed Tickets (ALL UNASSIGNED - Awaiting Admin Manual Assignment)
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'CRM-000001',
      customerId: customerJohn.id,
      applicationId: appSkillBridge.id,
      subject: 'Unable to login to SkillBridge student portal',
      description: 'I keep getting invalid credentials even after resetting my password three times.',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      assignedAgentId: null, // Strictly UNASSIGNED
      assignedTeamId: techTeam.id,
      source: TicketSource.EMAIL,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      conversation: { create: {} },
    },
    include: { conversation: true },
  });

  const msg1 = await prisma.ticketMessage.create({
    data: {
      ticketId: ticket1.id,
      conversationId: ticket1.conversation?.id,
      senderType: 'CUSTOMER',
      senderCustomerId: customerJohn.id,
      messageType: 'PUBLIC',
      bodyText: 'I keep getting invalid credentials even after resetting my password three times. Need access to exam materials before 5 PM.',
      source: TicketSource.EMAIL,
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
    },
  });

  await prisma.emailMessage.create({
    data: {
      ticketMessageId: msg1.id,
      ticketId: ticket1.id,
      direction: 'INBOUND',
      providerMessageId: '<email-001@example.com>',
      fromAddress: customerJohn.email,
      toAddress: appSkillBridge.supportEmail,
      subject: 'Unable to login to SkillBridge student portal',
      bodyText: msg1.bodyText,
      status: 'RECEIVED',
      receivedAt: msg1.createdAt,
    },
  });

  // Ticket 2: Susruta Hospital (CRM-000002) - Unassigned
  await prisma.ticket.create({
    data: {
      ticketNumber: 'CRM-000002',
      customerId: customerDrMehta.id,
      applicationId: appSusruta.id,
      subject: 'Lab results not syncing to patient dashboard in Ward 3',
      description: 'The biochemistry analyzer results are uploading to the server but not displaying in the physician UI.',
      priority: TicketPriority.URGENT,
      status: TicketStatus.OPEN,
      assignedAgentId: null, // Strictly UNASSIGNED
      assignedTeamId: enterpriseTeam.id,
      source: TicketSource.EMAIL,
      createdAt: new Date(Date.now() - 1000 * 60 * 180),
      conversation: { create: {} },
    },
  });

  // 7. Initial Admin System Notification for Unassigned Tickets
  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: 'New Support Ticket: CRM-000001',
      message: 'A new support ticket CRM-000001 from John Doe awaits manual agent assignment.',
      type: 'TICKET_CREATED',
      link: `/admin/tickets/${ticket1.id}`,
      isRead: false,
    },
  });

  console.log('✓ Seeding complete. Initial Super Admin ready. No demo roles created.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
