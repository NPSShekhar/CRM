import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema } from '../validators/index.js';

const router = Router();

router.use(authenticate);

router.get('/', CustomerController.list);
router.get('/:id', CustomerController.getById);
router.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'AGENT'),
  validate(createCustomerSchema),
  CustomerController.create
);
router.put(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'AGENT'),
  validate(updateCustomerSchema),
  CustomerController.update
);

export default router;
