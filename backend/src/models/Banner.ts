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

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { nullable: true })
  restaurantId?: string;

  @ManyToOne(() => Restaurant, { nullable: true })
  @JoinColumn({ name: 'restaurantId' })
  restaurant?: Restaurant;

  @Column()
  title!: string;

  @Column()
  imageUrl!: string;

  @Column({ nullable: true })
  linkUrl?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  order!: number;

  @Column({ type: 'varchar', default: 'horizontal' })
  type!: 'horizontal' | 'vertical'; // horizontal = 16:9, vertical = 4:5

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
