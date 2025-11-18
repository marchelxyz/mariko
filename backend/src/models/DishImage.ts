import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dish_images')
export class DishImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  imageUrl!: string;

  @Column({ nullable: true })
  name?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
