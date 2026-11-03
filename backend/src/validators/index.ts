import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'AGENT', 'CUSTOMER']).optional(),
  }),
});

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    applicationIds: z.array(z.string()).optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    applicationIds: z.array(z.string()).optional(),
  }),
});

export const createApplicationSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Application name is required'),
    code: z.string().min(2, 'Application code is required').toUpperCase(),
    description: z.string().optional().nullable(),
    supportEmail: z.string().email('Valid support email is required'),
    logoUrl: z.string().url().optional().nullable(),
  }),
});

export const updateApplicationSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    supportEmail: z.string().email().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    logoUrl: z.string().url().optional().nullable(),
  }),
});

export const createTicketSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    customerEmail: z.string().email().optional(),
    customerName: z.string().optional(),
    applicationId: z.string().uuid(),
    subject: z.string().min(3, 'Subject must be at least 3 characters'),
    description: z.string().min(5, 'Description must be at least 5 characters'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    categoryId: z.string().uuid().optional().nullable(),
    source: z.enum(['EMAIL', 'WHATSAPP', 'WEB', 'CUSTOMER_PORTAL']).default('WEB'),
  }),
});

export const updateTicketStatusSchema = z.object({
  body: z.object({
    status: z.enum(['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED']),
  }),
});

export const updateTicketPrioritySchema = z.object({
  body: z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  }),
});

export const assignTicketSchema = z.object({
  body: z.object({
    agentId: z.string().uuid().nullable().optional(),
    teamId: z.string().uuid().nullable().optional(),
    reason: z.string().optional(),
  }),
});

export const createTicketMessageSchema = z.object({
  body: z.object({
    bodyText: z.string().min(1, 'Message body is required'),
    bodyHtml: z.string().optional(),
    messageType: z.enum(['PUBLIC', 'INTERNAL_NOTE']).default('PUBLIC'),
    source: z.enum(['EMAIL', 'WHATSAPP', 'WEB', 'CUSTOMER_PORTAL']).default('WEB'),
  }),
});

export const incomingEmailSchema = z.object({
  body: z.object({
    from: z.string().email('Sender email is required'),
    fromName: z.string().optional(),
    to: z.string().email('Recipient email is required'),
    subject: z.string().min(1, 'Email subject is required'),
    bodyText: z.string().default(''),
    bodyHtml: z.string().optional(),
    messageId: z.string().min(1, 'Message-ID is required for idempotency'),
    inReplyTo: z.string().optional().nullable(),
    references: z.string().optional().nullable(),
    receivedAt: z.string().datetime().optional(),
  }),
});

export const emailSettingsSchema = z.object({
  body: z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    username: z.string().default(''),
    password: z.string().default(''),
    fromEmail: z.string().email(),
    fromName: z.string().min(1),
    encryption: z.enum(['NONE', 'STARTTLS', 'SSL/TLS']).default('STARTTLS'),
  }),
});

export const assignmentRuleSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    applicationId: z.string().uuid(),
    strategy: z.enum(['ROUND_ROBIN', 'LEAST_ASSIGNED', 'APPLICATION_BASED', 'TEAM_BASED', 'MANUAL']),
    teamId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().default(true),
    priority: z.number().int().default(1),
  }),
});
