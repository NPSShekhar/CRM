import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller.js';
import { EmailController } from '../controllers/email.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import {
  createTicketSchema,
  updateTicketStatusSchema,
  updateTicketPrioritySchema,
  assignTicketSchema,
  createTicketMessageSchema,
} from '../validators/index.js';

const router = Router();

router.use(authenticate);

// Attachment upload
router.post('/attachments', upload.single('file'), TicketController.uploadAttachment);

// Tickets CRUD
router.get('/', TicketController.list);
router.post('/', validate(createTicketSchema), TicketController.create);
router.get('/:id', TicketController.getById);

// Step 25: Ticket Timeline
router.get('/:id/timeline', TicketController.getTimeline);

// Step 6: Agent Acknowledges
router.post(
  '/:id/acknowledge',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  TicketController.acknowledge
);

// Step 8: Escalate Ticket
router.post(
  '/:id/escalate',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  TicketController.escalate
);

// Step 9: Resolve & Document
router.post(
  '/:id/resolve',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  TicketController.resolve
);

// Step 10: Customer Confirms Resolution
router.post('/:id/confirm-resolution', TicketController.confirmResolution);

// Step 10: Reopen Path (Customer reports issue persists)
router.post('/:id/report-issue-persists', TicketController.reportIssuePersists);

// Step 11: Customer Feedback (CSAT)
router.post('/:id/feedback', TicketController.submitFeedback);

// Status and Priority updates
router.put('/:id/status', validate(updateTicketStatusSchema), TicketController.updateStatus);
router.patch('/:id/status', validate(updateTicketStatusSchema), TicketController.updateStatus);
router.post('/:id/status', validate(updateTicketStatusSchema), TicketController.updateStatus);

router.put(
  '/:id/priority',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  validate(updateTicketPrioritySchema),
  TicketController.updatePriority
);
router.patch(
  '/:id/priority',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  validate(updateTicketPrioritySchema),
  TicketController.updatePriority
);
router.post(
  '/:id/priority',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  validate(updateTicketPrioritySchema),
  TicketController.updatePriority
);

// Ticket Assignment
router.put(
  '/:id/assign',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'),
  validate(assignTicketSchema),
  TicketController.assign
);
router.patch(
  '/:id/assign',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'),
  validate(assignTicketSchema),
  TicketController.assign
);
router.post(
  '/:id/assign',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'),
  validate(assignTicketSchema),
  TicketController.assign
);

// Ticket Conversation & Messages
router.get('/:id/messages', TicketController.getMessages);
router.post('/:id/messages', validate(createTicketMessageSchema), TicketController.addMessage);
router.post(
  '/:ticketId/messages/:messageId/retry',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  EmailController.retryTicketMessage
);

export default router;
