import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/me', UserController.getMe);
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'), UserController.list);
router.get('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'), UserController.getById);

export default router;
