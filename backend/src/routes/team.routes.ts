import { Router } from 'express';
import { TeamController } from '../controllers/team.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', TeamController.list);
router.get('/:id', TeamController.getById);
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'), TeamController.create);
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'), TeamController.update);

export default router;
