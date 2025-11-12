import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  city!: string;

  @Column()
  address!: string;

  @Column()
  phoneNumber!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  googleSheetId?: string;

  @Column({ nullable: true })
  googleSheetUrl?: string;

  @Column({ nullable: true })
  googleSheetName?: string; // Название листа для этого ресторана

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
