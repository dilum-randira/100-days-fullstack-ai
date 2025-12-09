import { Request, Response, NextFunction } from 'express';
import { saveFileMetadata, saveMultipleFilesMetadata, listUserFiles, getFileById, deleteFileById } from '../services/fileService';
import { getStorageConfig } from '../config/storage';
import { getLocalFilePath } from '../services/storageService';
import fs from 'fs';

export const uploadSingleFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const config = getStorageConfig();

    const doc = await saveFileMetadata(req.user.id, {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: config.provider === 's3' ? file.buffer : undefined,
      localPath: config.provider === 'local' ? file.path : undefined,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

export const uploadMultipleFilesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded' });
      return;
    }

    const config = getStorageConfig();

    const docs = await saveMultipleFilesMetadata(
      req.user.id,
      files.map((file) => ({
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: config.provider === 's3' ? file.buffer : undefined,
        localPath: config.provider === 'local' ? (file as any).path : undefined,
      }))
    );

    res.status(201).json({ success: true, data: docs });
  } catch (error) {
    next(error);
  }
};

export const listFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const files = await listUserFiles(req.user.id);
    res.status(200).json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const file = await getFileById(id, req.user.id);

    if (!file) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    if (file.storage === 's3') {
      res.redirect(file.url);
      return;
    }

    const filePath = getLocalFilePath(file.key);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'Local file missing' });
      return;
    }

    res.download(filePath, file.originalName);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const file = await deleteFileById(id, req.user.id);

    if (!file) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    next(error);
  }
};
