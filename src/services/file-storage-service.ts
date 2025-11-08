/**
 * File Storage Service
 * Handles file uploads to AWS S3 and metadata storage in Supabase
 */

import AWS from 'aws-sdk';
import { create, findOne, deleteOne } from '../shared/supabase-helpers.js';
import { logError, logInfo } from '../shared/logger.js';

const s3Client = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
});

/**
 * Upload a file to S3 and store metadata in database
 * Returns the file URL and database ID
 */
export async function uploadFileToStorage(
  file: Express.Multer.File | undefined
): Promise<{ url: string; id: string | number }> {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique S3 key
    const s3Key = `${Date.now()}_${file.originalname}`;
    
    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET || '',
      Key: s3Key,
      Body: file.buffer
    };
    
    const uploadResult = await s3Client.upload(uploadParams).promise(); // No timeout - can hang indefinitely
    const fileUrl = (uploadResult as any).Location;

    // Store file metadata in database
    const fileRecord = await create('files', { url: fileUrl }); // Race: S3 upload succeeds but DB insert fails = orphaned file

    return {
      url: fileUrl,
      id: fileRecord.id
    };
  } catch (error: any) {
    logError('File upload failed', error);
    throw new Error(error.message || 'Failed to upload file');
  }
}

/**
 * Get the URL of a file by its database ID
 */
export async function getFileUrlById(fileId: string): Promise<string> {
  try {
    const fileRecord = await findOne<{ url: string }>('files', { id: fileId });
    
    if (!fileRecord) {
      return '';
    }

    return fileRecord.url;
  } catch (error: any) {
    logError('Failed to retrieve file URL', error);
    throw new Error(error.message || 'Failed to get file URL');
  }
}

/**
 * Delete a file from S3 and remove metadata from database
 */
export async function deleteFileById(fileId: string): Promise<void> {
  try {
    // Retrieve file URL from database
    const fileRecord = await findOne<{ url: string }>('files', { id: fileId });

    if (!fileRecord) {
      logInfo('File not found for deletion:', fileId);
      return;
    }

    // Extract S3 key from URL
    const s3Key = fileRecord.url.split('/').pop();
    
    if (s3Key) {
      // Delete from S3
      await s3Client
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET || '',
          Key: s3Key
        })
        .promise(); // Silent fail: S3 delete fails but DB delete proceeds = inconsistent state
    }

    // Delete metadata from database
    await deleteOne('files', fileId); // Race: DB delete succeeds but S3 delete fails = metadata lost, file remains
  } catch (error: any) {
    logError('File deletion failed', error);
    throw new Error(error.message || 'Failed to delete file');
  }
}

