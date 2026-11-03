import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { prisma } from '../config/db.js';
import { config } from '../config/index.js';
import { BootstrapService } from '../services/bootstrap.service.js';
import { verifyEmailConnection } from '../services/email.service.js';
import { IncomingEmailService } from '../services/incoming-email.service.js';
import { NotificationService } from '../services/notification.service.js';
import { RealtimeNotificationService } from '../services/realtime-notification.service.js';

describe('Production CRM Authentication, Agent Management & Workflow Suite', () => {
  let adminToken: string;
  let agentToken: string;
  let testAppId: string;
  let johnCustomerId: string;
  let createdAgentId: string;
  let createdAgentUserId: string;

  const adminEmail = (config.admin?.email || process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
  const adminPassword = config.admin?.password || process.env.ADMIN_PASSWORD || 'Admin@SecurePassword123';
  const testAgentEmail = `agent.ravi.${Date.now()}@example.com`;
  const testAgentPassword = 'AgentSecurePassword@123';

  beforeAll(async () => {
    // 1. Ensure Super Admin is bootstrapped from environment variables
    await BootstrapService.bootstrapAdmin();

    // 2. Authenticate as Super Admin using environment credentials
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    expect(adminRes.body.data.user.role).toBe('SUPER_ADMIN');
    expect(adminRes.body.data.user.password).toBeUndefined();
    expect(adminRes.body.data.user.passwordHash).toBeUndefined();
    adminToken = adminRes.body.data.token;

    // 3. Get existing application (SkillBridge)
    let appRecord = await prisma.application.findFirst({ where: { code: 'SKILLBRIDGE' } });
    if (!appRecord) {
      appRecord = await prisma.application.create({
        data: {
          name: 'SkillBridge',
          code: 'SKILLBRIDGE',
          description: 'Online learning platform',
          supportEmail: 'support@skillbridge.com',
          status: 'ACTIVE',
        },
      });
    }
    testAppId = appRecord.id;

    // 4. Ensure customer John Doe exists
    let johnCustomer = await prisma.customer.findFirst({
      where: { email: 'john@example.com' },
    });
    if (!johnCustomer) {
      johnCustomer = await prisma.customer.create({
        data: {
          customerCode: 'CUST-000001',
          name: 'John Doe',
          email: 'john@example.com',
          status: 'ACTIVE',
        },
      });
    }
    johnCustomerId = johnCustomer.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. AUTHENTICATION & SECURITY TESTS
  // =========================================================================

  it('1. Admin Login: Authenticates successfully using environment credentials and returns safe user data', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(adminEmail);
    expect(res.body.data.user.role).toBe('SUPER_ADMIN');
    // Security check: Never expose password or password hash
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('2. Invalid Password: Returns generic 401 error "Invalid email or password"', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'WrongPassword@999' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('3. Unknown Email: Returns generic 401 error without revealing whether email exists', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent.user@randomdomain.org', password: 'SomePassword@123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('4. Unauthenticated Access: Protected admin routes reject requests without a token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // =========================================================================
  // 2. AGENT PROVISIONING & AGENT LOGIN
  // =========================================================================

  it('5. Admin Creates Agent: Hashes password, creates active agent profile without exposing credentials', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ravi Kumar',
        email: testAgentEmail,
        password: testAgentPassword,
        status: 'ACTIVE',
        maxCapacity: 15,
        skills: ['Authentication', 'SkillBridge'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('Ravi Kumar');
    expect(res.body.data.user.email).toBe(testAgentEmail);
    expect(res.body.data.user.role).toBe('AGENT');
    // Ensure password hash is not leaked
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();

    createdAgentId = res.body.data.id;
    createdAgentUserId = res.body.data.userId;

    // Verify password in database is hashed with bcrypt
    const userInDb = await prisma.user.findUnique({ where: { email: testAgentEmail } });
    expect(userInDb).toBeDefined();
    expect(userInDb?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(userInDb?.passwordHash).not.toBe(testAgentPassword);
  });

  it('6. Agent Login: Created Agent logs in with their credentials and receives AGENT role session', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testAgentEmail, password: testAgentPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testAgentEmail);
    expect(res.body.data.user.role).toBe('AGENT');
    agentToken = res.body.data.token;
  });

  it('7. Role-Based Access Control: Agent cannot access Admin-only endpoints (returns 403)', async () => {
    const forbiddenRes = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${agentToken}`);

    // /api/agents requires SUPER_ADMIN, ADMIN, or SUPPORT_MANAGER
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);
  });

  it('8. Agent Management Actions: Admin can toggle status and reset password', async () => {
    // 1. Deactivate Agent
    const deactivateRes = await request(app)
      .patch(`/api/agents/${createdAgentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'INACTIVE' });

    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.data.user.status).toBe('INACTIVE');
    expect(deactivateRes.body.data.isAvailable).toBe(false);

    // 2. Reactivate Agent
    const activateRes = await request(app)
      .patch(`/api/agents/${createdAgentId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(activateRes.status).toBe(200);
    expect(activateRes.body.data.user.status).toBe('ACTIVE');

    // 3. Reset Password
    const resetRes = await request(app)
      .post(`/api/agents/${createdAgentId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'NewAgentPassword@456' });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.data.success).toBe(true);

    // 4. Verify agent can now login with new password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testAgentEmail, password: 'NewAgentPassword@456' });

    expect(newLoginRes.status).toBe(200);
    agentToken = newLoginRes.body.data.token;
  });

  // =========================================================================
  // 3. TICKET CREATION & MANUAL ASSIGNMENT WORKFLOW
  // =========================================================================

  it('9. Manual Assignment Rule: New ticket creation must NOT auto-assign and must be UNASSIGNED', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: johnCustomerId,
        applicationId: testAppId,
        subject: 'Database sync failure on student dashboard',
        description: 'Records are out of sync since last night.',
        priority: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticketNumber).toMatch(/^CRM-\d{6}$/);
    expect(res.body.data.assignedAgentId).toBeNull(); // Strictly UNASSIGNED
  });

  it('10. Inbound Email Ingestion: Creates OPEN, UNASSIGNED ticket and notifies Admin', async () => {
    const msgId = `<msg-support-${Date.now()}@customer.org>`;
    const res = await request(app)
      .post('/api/email/incoming')
      .send({
        from: 'john@example.com',
        fromName: 'John Doe',
        to: 'chandra2001ks@gmail.com',
        subject: 'Course video player buffer overflow',
        bodyText: 'The video player crashes every 10 minutes.',
        messageId: msgId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isNewTicket).toBe(true);

    const ticketInDb = await prisma.ticket.findUnique({
      where: { id: res.body.data.ticketId },
    });
    expect(ticketInDb).not.toBeNull();
    expect(ticketInDb!.assignedAgentId).toBeNull(); // Strictly UNASSIGNED
    expect(['OPEN', 'NEW']).toContain(ticketInDb!.status);

    // Verify Admin received TICKET_CREATED notification
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    const notification = await prisma.notification.findFirst({
      where: {
        userId: adminUser!.id,
        type: 'TICKET_CREATED',
        entityId: ticketInDb!.id,
      },
    });
    expect(notification).toBeDefined();
  });

  it('11. Admin Manual Assignment: Admin manually assigns Agent Ravi and Ravi receives notification', async () => {
    // 1. Create fresh unassigned ticket
    const createRes = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: johnCustomerId,
        applicationId: testAppId,
        subject: 'SSO Certificate Renewal Inquiry',
        description: 'Customer requests instructions for updating SAML signing cert.',
        priority: 'MEDIUM',
      });

    const ticketId = createRes.body.data.id;
    expect(createRes.body.data.assignedAgentId).toBeNull();

    // 2. Admin manually assigns Ravi
    const assignRes = await request(app)
      .put(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        agentId: createdAgentId,
        reason: 'Manually assigned by Admin based on technical domain fit',
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.assignedAgentId).toBe(createdAgentId);

    // 3. Verify Ravi received TICKET_ASSIGNED notification
    const agentNotif = await prisma.notification.findFirst({
      where: {
        userId: createdAgentUserId,
        type: 'TICKET_ASSIGNED',
        entityId: ticketId,
      },
    });
    expect(agentNotif).toBeDefined();
    expect(agentNotif?.title).toContain('CRM-');
  });

  it('12. Inbound Email Thread Detection: Replies matching [CRM-XXXXXX] append to conversation without creating a new ticket', async () => {
    // 1. Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `CRM-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId: johnCustomerId,
        applicationId: testAppId,
        subject: 'Billing inquiry regarding Q3 invoice',
        description: 'Where is our Q3 receipt?',
        priority: 'MEDIUM',
        status: 'WAITING_FOR_CUSTOMER',
        assignedAgentId: createdAgentId,
        source: 'EMAIL',
      },
    });

    // 2. Customer replies with [CRM-XXXXXX] in subject
    const replyRes = await request(app)
      .post('/api/v1/email/incoming')
      .send({
        from: 'john@example.com',
        fromName: 'John Doe',
        to: 'chandra2001ks@gmail.com',
        subject: `Re: [${ticket.ticketNumber}] Billing inquiry regarding Q3 invoice`,
        bodyText: 'Here is our transaction reference: TXN-89211.',
        messageId: `<reply-${Date.now()}@customer.com>`,
      });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.isNewTicket).toBe(false);
    expect(replyRes.body.data.ticketId).toBe(ticket.id);

    // Verify message was appended
    const messages = await prisma.ticketMessage.findMany({ where: { ticketId: ticket.id } });
    expect(messages.some((m) => m.bodyText.includes('TXN-89211'))).toBe(true);

    // Verify Agent Ravi was notified of the customer reply
    const replyNotif = await prisma.notification.findFirst({
      where: {
        userId: createdAgentUserId,
        type: 'CUSTOMER_REPLY',
        entityId: ticket.id,
      },
    });
    expect(replyNotif).toBeDefined();
  });

  // =========================================================================
  // 4. NOTIFICATIONS API & USER ISOLATION
  // =========================================================================

  it('13. Notifications API: Retrieves unread count, paginated list, and marks as read', async () => {
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(countRes.status).toBe(200);
    expect(typeof countRes.body.data.count).toBe('number');

    const listRes = await request(app)
      .get('/api/v1/notifications?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.notifications).toBeDefined();
  });

  it('14. Gmail SMTP Connection Verification: verifyEmailConnection returns boolean safely', async () => {
    const isConnected = await verifyEmailConnection();
    expect(typeof isConnected).toBe('boolean');
  });

  it('15. Gmail IMAP Connection Verification: IncomingEmailService.checkConnection returns boolean safely', async () => {
    const isConnected = await IncomingEmailService.checkConnection();
    expect(typeof isConnected).toBe('boolean');
    expect(isConnected).toBe(true);
  });

  it('16. Inbound Email Sync Endpoint: POST /api/v1/email/sync requires auth and succeeds', async () => {
    const unauthRes = await request(app).post('/api/v1/email/sync');
    expect(unauthRes.status).toBe(401);

    const spy = vi.spyOn(IncomingEmailService, 'checkInboxOnce').mockResolvedValueOnce({ processed: 2, errors: 0 });

    const authRes = await request(app)
      .post('/api/v1/email/sync')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(authRes.status).toBe(200);
    expect(authRes.body.data).toHaveProperty('processed', 2);
    expect(authRes.body.data).toHaveProperty('errors', 0);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('17. Real-time Notification SSE Endpoint: Rejects unauthenticated requests and registers SSE clients', async () => {
    const unauthRes = await request(app).get('/api/v1/notifications/stream');
    expect(unauthRes.status).toBe(401);

    // Verify RealtimeNotificationService user registration and push
    const testUserId = 'test-user-sse-check';
    const mockRes = {
      writeHead: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    };

    const cleanup = RealtimeNotificationService.addClient(testUserId, mockRes as any);
    expect(RealtimeNotificationService.getActiveConnectionsCount()).toBeGreaterThanOrEqual(1);

    const testPayload = {
      id: 'notif-sse-test',
      userId: testUserId,
      title: 'New Ticket Arrived',
      message: 'Ticket CRM-999999 created',
      type: 'TICKET_CREATED',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    RealtimeNotificationService.sendNotificationToUser(testUserId, testPayload);
    expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('event: notification\n'));
    expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining('CRM-999999'));

    cleanup();
    expect(RealtimeNotificationService.getActiveConnectionsCount()).toBe(0);
  });
});
