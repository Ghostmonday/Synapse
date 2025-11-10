/**
 * Files service using aws-sdk S3 (v2) + Supabase
 * - uploadFile(file)
 * - getFileUrl(id)
 * - deleteFile(id)
 * Uses Supabase REST API for metadata storage
 */

import AWS from 'aws-sdk';
import { supabase } from '../../config/db.js';
import { logInfo, logError } from '../../shared/logger.js';
import { getAwsKeys } from '../../services/api-keys-service.js';

let s3: AWS.S3 | null = null;

async function getS3Client(): Promise<AWS.S3> {
  if (!s3) {
    const awsKeys = await getAwsKeys();
    s3 = new AWS.S3({
      accessKeyId: awsKeys.accessKeyId,
      secretAccessKey: awsKeys.secretAccessKey,
      region: awsKeys.region || 'us-east-1',
    });
  }
  return s3;
}

/**
 * Upload file to S3 and store metadata in Supabase
 */
export async function uploadFile(file: Express.Multer.File | undefined) {
  try {
    if (!file) throw new Error('No file provided');
    
    const s3Client = await getS3Client();
    const awsKeys = await getAwsKeys();
    const key = `${Date.now()}_${file.originalname}`;
    const params = { Bucket: awsKeys.bucket || '', Key: key, Body: file.buffer };
    const res = await s3Client.upload(params).promise();
    const url = (res as { Location: string }).Location;

    // Store file metadata in Supabase
    const { data, error } = await supabase
      .from('files')
      .insert([{ url }])
      .select()
      .single();

    if (error) throw error;

    return { url, id: data.id };
  } catch (e: unknown) {
    logError('uploadFile error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'File upload failed');
  }
}

/**
 * Get file URL from Supabase by ID
 */
export async function getFileUrl(id: string) {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('url')
      .eq('id', id)
      .single();

    if (error || !data) {
      return '';
    }

    return data.url;
  } catch (e: unknown) {
    logError('getFileUrl error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Failed to get file URL');
  }
}

/**
 * Delete file from S3 and remove metadata from Supabase
 */
export async function deleteFile(id: string) {
  try {
    // Get file URL first
    const { data, error } = await supabase
      .from('files')
      .select('url')
      .eq('id', id)
      .single();

    if (error || !data) {
      logInfo('File not found for deletion:', id);
      return;
    }

    // Delete from S3
    const s3Client = await getS3Client();
    const awsKeys = await getAwsKeys();
    const url = data.url;
    const key = url.split('/').pop();
    if (key) {
      await s3Client.deleteObject({ Bucket: awsKeys.bucket || '', Key: key }).promise();
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  } catch (e: unknown) {
    logError('deleteFile error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'File deletion failed');
  }
}
