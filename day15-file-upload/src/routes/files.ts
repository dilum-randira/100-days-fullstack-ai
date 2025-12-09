import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { uploadSingle, uploadMultiple } from '../middleware/multerConfig';
import {
  uploadSingleFile,
  uploadMultipleFilesController,
  listFiles,
  downloadFile,
  deleteFile,
} from '../controllers/fileController';

const router = Router();

router.post('/upload', authenticate, uploadSingle, uploadSingleFile);
router.post('/upload-multiple', authenticate, uploadMultiple, uploadMultipleFilesController);
router.get('/', authenticate, listFiles);
router.get('/:id', authenticate, downloadFile);
router.delete('/:id', authenticate, deleteFile);

export default router;
