import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Restaurant } from './Restaurant';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  restaurantId!: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant?: Restaurant;

  @Column()
  name!: string;

  @Column('text')
  description!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;

  @Column()
  category!: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column('uuid', { nullable: true })
  dishImageId?: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  calories?: number;

  @Column('text', { nullable: true })
  ingredients?: string;

  @Column({ nullable: true })
  internalDishId?: string; // ID блюда из Google Sheets

  @Column({ default: true })
  isAvailable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
