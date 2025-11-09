/**
 * Unit Tests for File Storage Service
 * Tests S3 upload, metadata storage, and file retrieval
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AWS from 'aws-sdk';
import { uploadFileToStorage, getFileUrlById, deleteFileById } from '../file-storage-service.js';
import * as supabaseHelpers from '../../shared/supabase-helpers.js';
import * as logger from '../../shared/logger.js';

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('../../shared/supabase-helpers.js');
jest.mock('../../shared/logger.js');

describe('File Storage Service', () => {
  let mockS3: any;
  let mockS3Upload: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock S3 upload
    mockS3Upload = {
      promise: jest.fn().mockResolvedValue({
        Location: 'https://s3.amazonaws.com/bucket/file.jpg'
      })
    };

    // Mock S3 client
    mockS3 = {
      upload: jest.fn().mockReturnValue(mockS3Upload),
      deleteObject: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      })
    };

    (AWS.S3 as jest.Mock).mockImplementation(() => mockS3);
  });

  describe('uploadFileToStorage', () => {
    it('should upload file to S3 and store metadata', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test content'),
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      const mockFileRecord = {
        id: 'file-123',
        url: 'https://s3.amazonaws.com/bucket/file.jpg'
      };

      (supabaseHelpers.create as jest.Mock).mockResolvedValue(mockFileRecord);

      process.env.AWS_S3_BUCKET = 'test-bucket';

      const result = await uploadFileToStorage(mockFile);

      expect(mockS3.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: expect.stringContaining('test.jpg'),
          Body: mockFile.buffer
        })
      );

      expect(supabaseHelpers.create).toHaveBeenCalledWith('files', {
        url: 'https://s3.amazonaws.com/bucket/file.jpg'
      });

      expect(result.url).toBe('https://s3.amazonaws.com/bucket/file.jpg');
      expect(result.id).toBe('file-123');
    });

    it('should throw error for missing file', async () => {
      await expect(uploadFileToStorage(undefined)).rejects.toThrow('No file provided');
    });

    it('should handle S3 upload failure', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      mockS3Upload.promise.mockRejectedValue(new Error('S3 upload failed'));

      await expect(uploadFileToStorage(mockFile)).rejects.toThrow('S3 upload failed');
    });

    it('should handle database insert failure', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      process.env.AWS_S3_BUCKET = 'test-bucket';
      (supabaseHelpers.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(uploadFileToStorage(mockFile)).rejects.toThrow('DB error');
    });

    it('should generate unique S3 key with timestamp', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg'
      } as Express.Multer.File;

      process.env.AWS_S3_BUCKET = 'test-bucket';
      (supabaseHelpers.create as jest.Mock).mockResolvedValue({ id: 'file-123' });

      await uploadFileToStorage(mockFile);

      const uploadCall = mockS3.upload.mock.calls[0][0];
      expect(uploadCall.Key).toMatch(/^\d+_test\.jpg$/);
    });
  });

  describe('getFileUrlById', () => {
    it('should retrieve file URL by ID', async () => {
      const fileId = 'file-123';
      const mockFile = {
        id: fileId,
        url: 'https://s3.amazonaws.com/bucket/file.jpg'
      };

      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue(mockFile);

      const result = await getFileUrlById(fileId);

      expect(supabaseHelpers.findOne).toHaveBeenCalledWith('files', { id: fileId });
      expect(result).toBe('https://s3.amazonaws.com/bucket/file.jpg');
    });

    it('should return empty string for missing file', async () => {
      const fileId = 'nonexistent';
      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue(null);

      const result = await getFileUrlById(fileId);
      expect(result).toBe('');
    });
  });

  describe('deleteFileById', () => {
    it('should delete file from S3 and database', async () => {
      const fileId = 'file-123';
      const mockFile = {
        id: fileId,
        url: 'https://s3.amazonaws.com/bucket/1234567890_test.jpg'
      };

      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue(mockFile);
      (supabaseHelpers.deleteOne as jest.Mock).mockResolvedValue(true);
      process.env.AWS_S3_BUCKET = 'test-bucket';

      await deleteFileById(fileId);

      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: '1234567890_test.jpg'
      });

      expect(supabaseHelpers.deleteOne).toHaveBeenCalledWith('files', fileId);
    });

    it('should handle missing file gracefully', async () => {
      const fileId = 'nonexistent';
      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue(null);

      // Should not throw
      await expect(deleteFileById(fileId)).resolves.not.toThrow();
    });
  });
});

