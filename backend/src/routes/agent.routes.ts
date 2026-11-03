import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'), AgentController.list);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN'), AgentController.create);
router.get('/workload', AgentController.getWorkload);
router.get('/:id', AgentController.getById);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'), AgentController.update);
router.patch('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'), AgentController.update);
router.patch('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN'), AgentController.toggleStatus);
router.put('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN'), AgentController.toggleStatus);
router.post('/:id/reset-password', authorizeRoles('SUPER_ADMIN', 'ADMIN'), AgentController.resetPassword);

export default router;
