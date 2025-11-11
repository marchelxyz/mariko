import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  role: 'user' | 'admin' | 'marketing' | 'manager';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: { type: String, required: true, unique: true },
    firstName: String,
    lastName: String,
    username: String,
    phoneNumber: String,
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    role: { type: String, enum: ['user', 'admin', 'marketing', 'manager'], default: 'user' },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
