import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// List all configured channel integrations & their statuses
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), WebhookController.listIntegrations);

export default router;
