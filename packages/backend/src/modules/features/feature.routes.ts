import { Router } from 'express';
import { authenticate } from '../../middleware';
import { getFeatures } from './feature.controller';

const router = Router();

/** All feature routes require authentication */
router.get('/', authenticate, getFeatures);

export default router;
