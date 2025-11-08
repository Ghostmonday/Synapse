/**
 * File Storage Routes
 * Handles file upload, retrieval, and deletion endpoints
 */

import { Router } from 'express';
import multer from 'multer';
import * as fileStorageService from '../services/file-storage-service.js';
import { telemetryHook } from '../telemetry/index.js';

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max
const router = Router();

/**
 * POST /files/upload
 * Upload a file to S3 and store metadata
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    telemetryHook('files_upload_start');
    const result = await fileStorageService.uploadFileToStorage(req.file); // Error branch: S3 upload can hang, no timeout
    telemetryHook('files_upload_end');
    res.json(result);
  } catch (error) {
    next(error); // Error branch: partial failure (S3 succeeded but DB failed) not distinguished
  }
});

/**
 * GET /files/:id
 * Get file URL by database ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    telemetryHook('files_get_start');
    const url = await fileStorageService.getFileUrlById(req.params.id);
    telemetryHook('files_get_end');
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /files/:id
 * Delete a file from S3 and database
 */
router.delete('/:id', async (req, res, next) => {
  try {
    telemetryHook('files_delete_start');
    await fileStorageService.deleteFileById(req.params.id);
    telemetryHook('files_delete_end');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

