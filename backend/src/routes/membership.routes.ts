import { Router } from 'express';
import { MembershipController } from '../controllers/membership.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Plans
router.get('/plans', MembershipController.listPlans);
router.get('/plans/:id', MembershipController.getPlanById);
router.post('/plans', authorizeRoles('SUPER_ADMIN', 'ADMIN'), MembershipController.createPlan);
router.put('/plans/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), MembershipController.updatePlan);

// Customer Memberships
router.post('/assign', authorizeRoles('SUPER_ADMIN', 'ADMIN'), MembershipController.assignCustomerMembership);
router.get('/customer/:customerId', MembershipController.getCustomerMemberships);

export default router;
