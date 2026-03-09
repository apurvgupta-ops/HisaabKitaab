import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { groupService } from './group.service';

/**
 * GET /api/groups — returns all groups the user belongs to
 */
export const getUserGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const groups = await groupService.getUserGroups(user.id);
    res.status(200).json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/groups — creates a new group with creator as admin
 */
export const createGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const group = await groupService.createGroup(user.id, req.body);
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/groups/:id — returns a single group (members only)
 */
export const getGroupById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = req.params.id as string;
    const group = await groupService.getGroupById(id, user.id);
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/groups/:id — updates a group (admin only)
 */
export const updateGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = req.params.id as string;
    const group = await groupService.updateGroup(id, user.id, req.body);
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/groups/:id — deletes a group (admin only)
 */
export const deleteGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = req.params.id as string;
    await groupService.deleteGroup(id, user.id);
    res.status(200).json({
      success: true,
      data: { message: 'Group deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/groups/:id/members — adds a member by email (admin only)
 */
export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = req.params.id as string;
    const { email, role } = req.body;
    const group = await groupService.addMember(id, user.id, email, role ?? 'member');
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/groups/:id/members/:userId — removes a member (admin only)
 */
export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = req.params.id as string;
    const userId = req.params.userId as string;
    await groupService.removeMember(id, user.id, userId);
    res.status(200).json({
      success: true,
      data: { message: 'Member removed successfully' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/groups/:id/members/:userId/role — updates member role (admin only)
 */
export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const id = req.params.id as string;
    const userId = req.params.userId as string;
    const { role } = req.body;
    const group = await groupService.updateMemberRole(id, user.id, userId, role);
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};
