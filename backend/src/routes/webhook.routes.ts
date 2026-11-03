import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';

const router = Router();

// Webhook endpoints are public ingestion points called by external providers (SendGrid, Twilio, WhatsApp Cloud API)
router.post('/whatsapp', WebhookController.handleWhatsAppWebhook);
router.post('/email', WebhookController.handleEmailWebhook);

export default router;
