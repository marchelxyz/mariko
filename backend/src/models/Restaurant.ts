import { Schema, model, Document } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Restaurant = model<IRestaurant>('Restaurant', restaurantSchema);
