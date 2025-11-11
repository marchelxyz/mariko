import { Schema, model, Document } from 'mongoose';

export interface IBanner extends Document {
  restaurantId?: Schema.Types.ObjectId;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    linkUrl: String,
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Banner = model<IBanner>('Banner', bannerSchema);
