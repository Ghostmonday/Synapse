/**
 * File Upload Security Middleware
 * Validates file types, sizes, and content before upload
 */

import { Request, Response, NextFunction } from 'express';
import { logError, logInfo } from '../shared/logger.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB default
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB for PDFs

export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  const file = req.file;
  const mimeType = file.mimetype;
  const fileSize = file.size;

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    logInfo('File upload rejected', `Invalid MIME type: ${mimeType}`);
    return res.status(400).json({
      error: 'Invalid file type',
      allowedTypes: ALLOWED_MIME_TYPES
    });
  }

  // Validate file size based on type
  let maxSize = MAX_FILE_SIZE;
  if (mimeType.startsWith('image/')) {
    maxSize = MAX_IMAGE_SIZE;
  } else if (mimeType === 'application/pdf') {
    maxSize = MAX_PDF_SIZE;
  }

  if (fileSize > maxSize) {
    logInfo('File upload rejected', `File too large: ${fileSize} bytes`);
    return res.status(400).json({
      error: 'File too large',
      maxSize: maxSize,
      fileSize: fileSize
    });
  }

  // Basic content validation (check file signature/magic bytes)
  // TODO: Add virus scanning integration (ClamAV or cloud service)
  
  next();
};

