import { Router } from 'express';
import { EmailController } from '../controllers/email.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { incomingEmailSchema } from '../validators/index.js';

const router = Router();

// Outgoing email dispatch
router.post('/send', authenticate, EmailController.sendEmail);

// Incoming email webhook (called by email provider / webhook or parser)
router.post('/incoming', validate(incomingEmailSchema), EmailController.handleIncomingEmail);

// Test email endpoint
router.post('/test', authenticate, EmailController.testEmail);

// On-demand inbox sync endpoint
router.post('/sync', authenticate, EmailController.syncInbox);

// Retry failed email by emailId
router.post(
  '/retry/:id',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'AGENT'),
  EmailController.retryEmail
);

export default router;
