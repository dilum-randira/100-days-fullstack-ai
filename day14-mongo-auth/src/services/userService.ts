import { User, IUserDocument } from '../models/User';
import { normalizeEmail } from '../perf/optimize';

export const findUserByEmail = async (email: string): Promise<IUserDocument | null> => {
  const normalized = normalizeEmail(email);
  return User.findOne({ email: normalized }).exec();
};

export const findUserById = async (id: string): Promise<IUserDocument | null> => {
  return User.findById(id).exec();
};
