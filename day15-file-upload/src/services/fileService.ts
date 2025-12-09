import { Types } from 'mongoose';
import { FileModel, IFileDocument } from '../models/File';
import { uploadToStorage, deleteFromStorage, UploadFileParams } from './storageService';

export const saveFileMetadata = async (
  userId: string,
  fileParams: UploadFileParams
): Promise<IFileDocument> => {
  const stored = await uploadToStorage(fileParams);

  const doc = await FileModel.create({
    filename: stored.key,
    originalName: fileParams.originalName,
    mimetype: fileParams.mimetype,
    size: fileParams.size,
    url: stored.url,
    storage: stored.storage,
    key: stored.key,
    uploadedBy: new Types.ObjectId(userId),
  });

  return doc;
};

export const saveMultipleFilesMetadata = async (
  userId: string,
  files: UploadFileParams[]
): Promise<IFileDocument[]> => {
  const result: IFileDocument[] = [];

  for (const file of files) {
    const doc = await saveFileMetadata(userId, file);
    result.push(doc);
  }

  return result;
};

export const listUserFiles = async (userId: string): Promise<IFileDocument[]> => {
  return FileModel.find({ uploadedBy: userId }).sort({ createdAt: -1 }).exec();
};

export const getFileById = async (id: string, userId: string): Promise<IFileDocument | null> => {
  return FileModel.findOne({ _id: id, uploadedBy: userId }).exec();
};

export const deleteFileById = async (id: string, userId: string): Promise<IFileDocument | null> => {
  const file = await FileModel.findOneAndDelete({ _id: id, uploadedBy: userId }).exec();

  if (file) {
    await deleteFromStorage(file.storage, file.key);
  }

  return file;
};
