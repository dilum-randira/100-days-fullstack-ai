import { User, IUserDocument } from '../models/User';

export const findUserByEmail = async (email: string): Promise<IUserDocument | null> => {
  return User.findOne({ email }).exec();
};

export const findUserById = async (id: string): Promise<IUserDocument | null> => {
  return User.findById(id).exec();
};
