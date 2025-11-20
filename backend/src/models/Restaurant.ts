import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
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
  @Index() // ✅ Индекс для быстрого поиска активных ресторанов
  isActive!: boolean;

  @Column({ nullable: true })
  googleSheetId?: string;

  @Column({ nullable: true })
  googleSheetUrl?: string;

  @Column({ nullable: true })
  googleSheetName?: string; // Название листа для этого ресторана

  @Column({ nullable: true })
  lastSyncAt?: Date;

  // Доставка: массив агрегаторов (до 5), каждый содержит название, ссылку и URL изображения
  @Column({ type: 'jsonb', nullable: true })
  deliveryAggregators?: Array<{
    name: string;
    url: string;
    imageUrl?: string;
  }>;

  // Карты: ссылки на Яндекс карты и 2ГИС
  @Column({ nullable: true })
  yandexMapsUrl?: string;

  @Column({ nullable: true })
  twoGisUrl?: string;

  // Социальные сети: до 4 штук, каждая содержит название и ссылку
  @Column({ type: 'jsonb', nullable: true })
  socialNetworks?: Array<{
    name: string;
    url: string;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
