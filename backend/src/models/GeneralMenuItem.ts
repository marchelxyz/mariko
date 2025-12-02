import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('general_menu_items')
export class GeneralMenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column('text')
  description!: string;

  // Нет поля price - общее меню без цен

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
  @Index()
  isAvailable!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
