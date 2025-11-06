/**
 * Files routes: S3 uploads and retrieval
 */

import { Router } from 'express';
import multer from 'multer';
import * as filesService from '../services/files.js';
import { telemetryHook } from '../../telemetry/index.js';

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    telemetryHook('files_upload_start');
    const result = await filesService.uploadFile(req.file);
    telemetryHook('files_upload_end');
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    telemetryHook('files_get_start');
    const url = await filesService.getFileUrl(req.params.id);
    telemetryHook('files_get_end');
    res.json({ url });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    telemetryHook('files_delete_start');
    await filesService.deleteFile(req.params.id);
    telemetryHook('files_delete_end');
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;

