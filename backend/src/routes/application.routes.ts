import { Router } from 'express';
import { ApplicationController } from '../controllers/application.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createApplicationSchema, updateApplicationSchema } from '../validators/index.js';

const router = Router();

router.use(authenticate);

router.get('/', ApplicationController.list);
router.get('/:id', ApplicationController.getById);
router.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(createApplicationSchema),
  ApplicationController.create
);
router.put(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  validate(updateApplicationSchema),
  ApplicationController.update
);

export default router;
