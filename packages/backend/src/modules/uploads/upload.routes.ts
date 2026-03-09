import { Router, type IRouter } from 'express';
import { authenticate } from '../../middleware';
import { uploadSingle, uploadMultiple } from '../../shared/services/upload';
import {
  handleUpload,
  handleMultipleUpload,
  handleReceiptUpload,
} from './upload.controller';

const router: IRouter = Router();

router.post('/', authenticate, uploadSingle, handleUpload);
router.post('/multiple', authenticate, uploadMultiple, handleMultipleUpload);
router.post('/receipt', authenticate, uploadSingle, handleReceiptUpload);

export default router;
