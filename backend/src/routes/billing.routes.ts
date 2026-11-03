import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Billing summary and extra hours reports - accessible by ADMIN, SUPER_ADMIN, ACCOUNTANT
router.get(
  '/summary',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'),
  BillingController.getAccountantSummary
);

router.get(
  '/extra-hours',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'),
  BillingController.listExtraHours
);

router.put(
  '/extra-hours/:id/status',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'),
  BillingController.updateBillingStatus
);

router.get(
  '/export',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'),
  BillingController.exportCsv
);

export default router;
