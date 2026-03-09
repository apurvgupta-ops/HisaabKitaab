import type { Request, Response, NextFunction } from 'express';
import { uploadToS3 } from '../../shared/services/s3';
import { extractTextFromImage, parseReceiptText } from '../../shared/services/ocr';
import { AppError } from '../../middleware/errorHandler';

/**
 * Handles single file upload. Uploads to S3 and returns file metadata.
 */
export const handleUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      throw AppError.badRequest('No file uploaded');
    }

    const { key, url } = await uploadToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      'uploads'
    );

    res.status(201).json({
      success: true,
      data: {
        key,
        url,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handles multiple file upload. Uploads to S3 and returns array of file metadata.
 */
export const handleMultipleUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw AppError.badRequest('No files uploaded');
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const { key, url } = await uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          'uploads'
        );
        return {
          key,
          url,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        };
      })
    );

    res.status(201).json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handles receipt upload: uploads to S3, runs OCR, and returns upload + parsed receipt data.
 */
export const handleReceiptUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      throw AppError.badRequest('No file uploaded');
    }

    const { key, url } = await uploadToS3(
      file.buffer,
      file.originalname,
      file.mimetype,
      'receipts'
    );

    const text = await extractTextFromImage(file.buffer, file.mimetype);
    const parsed = parseReceiptText(text);

    res.status(201).json({
      success: true,
      data: {
        upload: {
          key,
          url,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        },
        receipt: parsed,
      },
    });
  } catch (err) {
    next(err);
  }
};
