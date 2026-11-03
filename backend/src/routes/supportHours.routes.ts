import { Router } from 'express';
import { SupportHoursController } from '../controllers/supportHours.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Time entries on tickets
router.post('/tickets/:ticketId/time-entries', SupportHoursController.logTimeEntry);
router.get('/tickets/:ticketId/time-entries', SupportHoursController.getTicketTimeEntries);

// Customer Support Hours Summary
router.get('/customers/:customerId/summary', SupportHoursController.getCustomerSupportSummary);

export default router;
