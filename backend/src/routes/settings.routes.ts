import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { emailSettingsSchema, assignmentRuleSchema } from '../validators/index.js';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('SUPER_ADMIN', 'ADMIN'));

// Email settings
router.get('/email', SettingsController.getEmailSettings);
router.put('/email', validate(emailSettingsSchema), SettingsController.updateEmailSettings);
router.post('/email/test', SettingsController.testSmtp);

// Assignment rules
router.get('/assignment-rules', SettingsController.listAssignmentRules);
router.post('/assignment-rules', validate(assignmentRuleSchema), SettingsController.createAssignmentRule);
router.put('/assignment-rules/:id', SettingsController.updateAssignmentRule);
router.delete('/assignment-rules/:id', SettingsController.deleteAssignmentRule);

export default router;
