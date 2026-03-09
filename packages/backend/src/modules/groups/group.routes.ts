import { Router } from 'express';
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '@splitwise/shared';
import { authenticate, validate } from '../../middleware';
import {
  getUserGroups,
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  updateMemberRole,
} from './group.controller';

const router = Router();

/** All group routes require authentication */
router.get('/', authenticate, getUserGroups);
router.post('/', authenticate, validate(createGroupSchema), createGroup);
router.get('/:id', authenticate, getGroupById);
router.put('/:id', authenticate, validate(updateGroupSchema), updateGroup);
router.delete('/:id', authenticate, deleteGroup);
router.post(
  '/:id/members',
  authenticate,
  validate(addMemberSchema),
  addMember,
);
router.delete('/:id/members/:userId', authenticate, removeMember);
router.patch(
  '/:id/members/:userId/role',
  authenticate,
  validate(updateMemberRoleSchema),
  updateMemberRole,
);

export default router;
