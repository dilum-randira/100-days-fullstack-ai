import { FeatureFlag, IFeatureFlagDocument } from '../models/FeatureFlag';
import { logger } from '../utils/logger';

export const getFlag = async (key: string): Promise<IFeatureFlagDocument | null> => {
  const flag = await FeatureFlag.findOne({ key }).exec();
  return flag;
};

export const isEnabled = async (key: string): Promise<boolean> => {
  const flag = await getFlag(key);
  return !!flag?.enabled;
};

export const setFlag = async (key: string, enabled: boolean, description?: string): Promise<IFeatureFlagDocument> => {
  const update: Partial<IFeatureFlagDocument> = { enabled };
  if (description !== undefined) {
    update.description = description as any;
  }

  const flag = await FeatureFlag.findOneAndUpdate(
    { key },
    { $set: update, $setOnInsert: { key } },
    { upsert: true, new: true },
  ).exec();

  logger.info('feature.flag.updated', { key, enabled });
  return flag;
};
