import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get(
  '/dashboard',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  ReportController.getDashboardMetrics
);

router.get(
  '/tickets',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER', 'AGENT'),
  ReportController.getTicketReport
);

router.get(
  '/agents',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'),
  ReportController.getAgentReport
);

router.get(
  '/sla',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'),
  ReportController.getSLAReport
);

router.get(
  '/customer-satisfaction',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'),
  ReportController.getCSATReport
);

export default router;
