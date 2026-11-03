"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting CRM database seeding...');
    // Clean existing records in reverse dependency order
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
    const salt = await bcryptjs_1.default.genSalt(10);
    const adminPasswordHash = await bcryptjs_1.default.hash('Admin@123', salt);
    const agentPasswordHash = await bcryptjs_1.default.hash('Agent@123', salt);
    const customerPasswordHash = await bcryptjs_1.default.hash('Customer@123', salt);
    // 1. Create Super Admin & Support Manager
    const admin = await prisma.user.create({
        data: {
            name: 'Super Admin',
            email: 'admin@crm.local',
            passwordHash: adminPasswordHash,
            role: client_1.UserRole.SUPER_ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const manager = await prisma.user.create({
        data: {
            name: 'Elena Rostova',
            email: 'elena.manager@crm.local',
            passwordHash: adminPasswordHash,
            role: client_1.UserRole.ADMIN,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    // 2. Create Teams
    const techTeam = await prisma.team.create({
        data: {
            name: 'Tier 1 Support Team',
            description: 'First response team for core software and integration questions',
            leadId: manager.id,
        },
    });
    const enterpriseTeam = await prisma.team.create({
        data: {
            name: 'Enterprise Escalations',
            description: 'Handles critical bugs, hospital systems, and enterprise SLA issues',
            leadId: manager.id,
        },
    });
    // 3. Create Agents
    const agentRaviUser = await prisma.user.create({
        data: {
            name: 'Ravi Kumar',
            email: 'ravi@crm.local',
            passwordHash: agentPasswordHash,
            role: client_1.UserRole.AGENT,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const agentRavi = await prisma.agent.create({
        data: {
            userId: agentRaviUser.id,
            teamId: techTeam.id,
            skills: ['Authentication', 'SkillBridge', 'API Integration'],
            maxCapacity: 15,
            currentLoad: 2,
            isAvailable: true,
        },
    });
    const agentPriyaUser = await prisma.user.create({
        data: {
            name: 'Priya Sharma',
            email: 'priya@crm.local',
            passwordHash: agentPasswordHash,
            role: client_1.UserRole.AGENT,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const agentPriya = await prisma.agent.create({
        data: {
            userId: agentPriyaUser.id,
            teamId: enterpriseTeam.id,
            skills: ['Susruta Hospital', 'HL7', 'Healthcare Workflow'],
            maxCapacity: 15,
            currentLoad: 1,
            isAvailable: true,
        },
    });
    const agentArjunUser = await prisma.user.create({
        data: {
            name: 'Arjun Patel',
            email: 'arjun@crm.local',
            passwordHash: agentPasswordHash,
            role: client_1.UserRole.AGENT,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const agentArjun = await prisma.agent.create({
        data: {
            userId: agentArjunUser.id,
            teamId: techTeam.id,
            skills: ['BizOne', 'Wings', 'Billing', 'Database Sync'],
            maxCapacity: 15,
            currentLoad: 1,
            isAvailable: true,
        },
    });
    // 4. Create Applications
    const appSkillBridge = await prisma.application.create({
        data: {
            name: 'SkillBridge',
            code: 'SKILLBRIDGE',
            description: 'Online learning platform and university course management portal',
            supportEmail: 'support@skillbridge.com',
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const appWings = await prisma.application.create({
        data: {
            name: 'Wings',
            code: 'WINGS',
            description: 'Fleet logistics and last-mile flight delivery coordinator',
            supportEmail: 'support@wings.com',
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const appBizOne = await prisma.application.create({
        data: {
            name: 'BizOne',
            code: 'BIZONE',
            description: 'SME ERP & accounting platform for inventory and tax compliance',
            supportEmail: 'support@bizone.com',
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const appSusruta = await prisma.application.create({
        data: {
            name: 'Susruta Hospital',
            code: 'SUSRUTA',
            description: 'Multi-specialty hospital management and patient records portal',
            supportEmail: 'support@susrutahospital.com',
            status: client_1.UserStatus.ACTIVE,
        },
    });
    // 5. Assignment Rules
    await prisma.assignmentRule.createMany({
        data: [
            {
                name: 'SkillBridge Round Robin',
                applicationId: appSkillBridge.id,
                teamId: techTeam.id,
                strategy: 'ROUND_ROBIN',
                isActive: true,
                priority: 1,
            },
            {
                name: 'Susruta Enterprise Healthcare SLA',
                applicationId: appSusruta.id,
                teamId: enterpriseTeam.id,
                strategy: 'LEAST_ASSIGNED',
                isActive: true,
                priority: 1,
            },
            {
                name: 'BizOne Support Rule',
                applicationId: appBizOne.id,
                teamId: techTeam.id,
                strategy: 'ROUND_ROBIN',
                isActive: true,
                priority: 1,
            },
        ],
    });
    // 6. Create Customers
    const customerJohn = await prisma.customer.create({
        data: {
            customerCode: 'CUST-000001',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1-555-0192',
            company: 'Apex Learning Group',
            status: client_1.UserStatus.ACTIVE,
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
            status: client_1.UserStatus.ACTIVE,
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
            status: client_1.UserStatus.ACTIVE,
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
    // 7. Seed Tickets with Conversation Timelines and Emails
    // Ticket 1: SkillBridge login issue (CRM-000001)
    const ticket1 = await prisma.ticket.create({
        data: {
            ticketNumber: 'CRM-000001',
            customerId: customerJohn.id,
            applicationId: appSkillBridge.id,
            subject: 'Unable to login to SkillBridge student portal',
            description: 'I keep getting invalid credentials even after resetting my password three times.',
            priority: client_1.TicketPriority.HIGH,
            status: client_1.TicketStatus.IN_PROGRESS,
            assignedAgentId: agentRavi.id,
            assignedTeamId: techTeam.id,
            source: client_1.TicketSource.EMAIL,
            firstResponseAt: new Date(Date.now() - 1000 * 60 * 45),
            createdAt: new Date(Date.now() - 1000 * 60 * 60),
            conversation: { create: {} },
        },
        include: { conversation: true },
    });
    // Initial customer message
    const msg1 = await prisma.ticketMessage.create({
        data: {
            ticketId: ticket1.id,
            conversationId: ticket1.conversation?.id,
            senderType: 'CUSTOMER',
            senderCustomerId: customerJohn.id,
            messageType: 'PUBLIC',
            bodyText: 'I keep getting invalid credentials even after resetting my password three times. Need access to exam materials before 5 PM.',
            source: client_1.TicketSource.EMAIL,
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
    // Agent Ravi reply
    const msg2 = await prisma.ticketMessage.create({
        data: {
            ticketId: ticket1.id,
            conversationId: ticket1.conversation?.id,
            senderType: 'AGENT',
            senderUserId: agentRaviUser.id,
            messageType: 'PUBLIC',
            bodyText: 'Hi John, thank you for reaching out. We have cleared your locked session state. Could you please clear your browser cookies and try logging in again via incognito window?',
            source: client_1.TicketSource.WEB,
            createdAt: new Date(Date.now() - 1000 * 60 * 45),
        },
    });
    await prisma.emailMessage.create({
        data: {
            ticketMessageId: msg2.id,
            ticketId: ticket1.id,
            direction: 'OUTBOUND',
            providerMessageId: '<crm-reply-001@crm.local>',
            inReplyTo: '<email-001@example.com>',
            references: '<email-001@example.com>',
            fromAddress: appSkillBridge.supportEmail,
            toAddress: customerJohn.email,
            subject: '[CRM-000001] Unable to login to SkillBridge student portal',
            bodyText: msg2.bodyText,
            status: 'SENT',
            sentAt: msg2.createdAt,
        },
    });
    // Internal note by Agent Ravi
    await prisma.ticketMessage.create({
        data: {
            ticketId: ticket1.id,
            conversationId: ticket1.conversation?.id,
            senderType: 'AGENT',
            senderUserId: agentRaviUser.id,
            messageType: 'INTERNAL_NOTE',
            bodyText: 'Customer account had 5 failed attempts triggered by automated script. Session cache evicted.',
            source: client_1.TicketSource.WEB,
            createdAt: new Date(Date.now() - 1000 * 60 * 40),
        },
    });
    // Customer reply
    const msg3 = await prisma.ticketMessage.create({
        data: {
            ticketId: ticket1.id,
            conversationId: ticket1.conversation?.id,
            senderType: 'CUSTOMER',
            senderCustomerId: customerJohn.id,
            messageType: 'PUBLIC',
            bodyText: 'Thanks Ravi! The incognito window worked, but my main Chrome browser is still showing a stale redirect. Let me clear cache completely.',
            source: client_1.TicketSource.EMAIL,
            createdAt: new Date(Date.now() - 1000 * 60 * 20),
        },
    });
    await prisma.emailMessage.create({
        data: {
            ticketMessageId: msg3.id,
            ticketId: ticket1.id,
            direction: 'INBOUND',
            providerMessageId: '<email-002@example.com>',
            inReplyTo: '<crm-reply-001@crm.local>',
            references: '<email-001@example.com> <crm-reply-001@crm.local>',
            fromAddress: customerJohn.email,
            toAddress: appSkillBridge.supportEmail,
            subject: 'Re: [CRM-000001] Unable to login to SkillBridge student portal',
            bodyText: msg3.bodyText,
            status: 'RECEIVED',
            receivedAt: msg3.createdAt,
        },
    });
    // Ticket 2: Susruta Hospital Lab System Sync (CRM-000002)
    const ticket2 = await prisma.ticket.create({
        data: {
            ticketNumber: 'CRM-000002',
            customerId: customerDrMehta.id,
            applicationId: appSusruta.id,
            subject: 'Lab results not syncing to patient dashboard in Ward 3',
            description: 'The biochemistry analyzer results are uploading to the server but not displaying in the physician UI.',
            priority: client_1.TicketPriority.URGENT,
            status: client_1.TicketStatus.OPEN,
            assignedAgentId: agentPriya.id,
            assignedTeamId: enterpriseTeam.id,
            source: client_1.TicketSource.EMAIL,
            firstResponseAt: new Date(Date.now() - 1000 * 60 * 120),
            createdAt: new Date(Date.now() - 1000 * 60 * 180),
            conversation: { create: {} },
        },
        include: { conversation: true },
    });
    await prisma.ticketMessage.create({
        data: {
            ticketId: ticket2.id,
            conversationId: ticket2.conversation?.id,
            senderType: 'CUSTOMER',
            senderCustomerId: customerDrMehta.id,
            messageType: 'PUBLIC',
            bodyText: 'The biochemistry analyzer results are uploading to the server but not displaying in the physician UI. Doctors need to verify blood panels urgently.',
            source: client_1.TicketSource.EMAIL,
        },
    });
    // Ticket 3: BizOne GST Invoice Tax Export (CRM-000003)
    const ticket3 = await prisma.ticket.create({
        data: {
            ticketNumber: 'CRM-000003',
            customerId: customerSarah.id,
            applicationId: appBizOne.id,
            subject: 'GST summary report calculation discrepancy for Q3',
            description: 'Exported excel file has tax component inverted on interstate invoices.',
            priority: client_1.TicketPriority.MEDIUM,
            status: client_1.TicketStatus.RESOLVED,
            assignedAgentId: agentArjun.id,
            assignedTeamId: techTeam.id,
            source: client_1.TicketSource.WEB,
            firstResponseAt: new Date(Date.now() - 1000 * 60 * 500),
            resolvedAt: new Date(Date.now() - 1000 * 60 * 100),
            createdAt: new Date(Date.now() - 1000 * 60 * 600),
            conversation: { create: {} },
        },
        include: { conversation: true },
    });
    await prisma.ticketMessage.create({
        data: {
            ticketId: ticket3.id,
            conversationId: ticket3.conversation?.id,
            senderType: 'CUSTOMER',
            senderCustomerId: customerSarah.id,
            messageType: 'PUBLIC',
            bodyText: 'Exported excel file has tax component inverted on interstate invoices.',
            source: client_1.TicketSource.WEB,
        },
    });
    await prisma.ticketMessage.create({
        data: {
            ticketId: ticket3.id,
            conversationId: ticket3.conversation?.id,
            senderType: 'AGENT',
            senderUserId: agentArjunUser.id,
            messageType: 'PUBLIC',
            bodyText: 'We deployed hotfix v2.4.1 which corrects the interstate IGST column mapping. Please re-run the Q3 export.',
            source: client_1.TicketSource.WEB,
        },
    });
    // Ticket 4: Wings Drone GPS Calibration (CRM-000004) - Unassigned
    await prisma.ticket.create({
        data: {
            ticketNumber: 'CRM-000004',
            customerId: customerSarah.id,
            applicationId: appWings.id,
            subject: 'Flight permit auto-renewal failing in Northern sector',
            description: 'The automated API handshake with aviation authority returned error 403.',
            priority: client_1.TicketPriority.HIGH,
            status: client_1.TicketStatus.NEW,
            assignedAgentId: null,
            source: client_1.TicketSource.EMAIL,
            createdAt: new Date(Date.now() - 1000 * 60 * 15),
            conversation: { create: {} },
        },
    });
    // 8. Notifications
    await prisma.notification.createMany({
        data: [
            {
                userId: agentRaviUser.id,
                title: 'New Ticket Assigned',
                message: 'Ticket CRM-000001: "Unable to login to SkillBridge student portal" assigned to you.',
                type: 'TICKET_ASSIGNED',
                link: `/tickets/${ticket1.id}`,
                isRead: false,
            },
            {
                userId: agentPriyaUser.id,
                title: 'Urgent Healthcare Ticket Assigned',
                message: 'Ticket CRM-000002: "Lab results not syncing to patient dashboard" assigned to you.',
                type: 'TICKET_ASSIGNED',
                link: `/tickets/${ticket2.id}`,
                isRead: false,
            },
            {
                userId: admin.id,
                title: 'New Customer Registered',
                message: 'Dr. Rajesh Mehta joined from Susruta Hospital.',
                type: 'CUSTOMER_CREATED',
                link: `/customers/${customerDrMehta.id}`,
                isRead: true,
            },
        ],
    });
    // 9. Default Email Configuration
    await prisma.emailConfiguration.create({
        data: {
            host: 'smtp.ethereal.email',
            port: 587,
            username: 'support.desk@ethereal.email',
            passwordEncrypted: 'mock-ethereal-secret',
            fromEmail: 'support@crm.local',
            fromName: 'Enterprise CRM Support',
            encryption: 'STARTTLS',
            isDefault: true,
            isActive: true,
        },
    });
    console.log('✅ Seeding completed successfully!');
    console.log(`
Default Login Credentials:
- Super Admin: admin@crm.local / Admin@123
- Manager:     elena.manager@crm.local / Admin@123
- Agent Ravi:  ravi@crm.local / Agent@123
- Agent Priya: priya@crm.local / Agent@123
- Agent Arjun: arjun@crm.local / Agent@123
  `);
}
main()
    .catch((e) => {
    console.error('✗ Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
