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

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

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

  // ReMarked API: ID заведения в системе ReMarked для бронирования столиков
  @Column({ nullable: true })
  remarkedPointId?: number;

  // Схемы залов для бронирования
  // Структура: массив залов, каждый содержит название, изображение и позиции столов
  @Column({ type: 'jsonb', nullable: true })
  hallSchemes?: Array<{
    roomId: string;                    // ID зала в ReMarked (строка, т.к. может быть числом или строкой)
    roomName: string;                  // Название зала
    imageUrl?: string;                  // URL изображения схемы зала (опционально)
    width?: number;                     // Ширина схемы в пикселях (для масштабирования)
    height?: number;                    // Высота схемы в пикселях (для масштабирования)
    tables: Array<{                    // Массив столов в зале
      tableId: number;                  // ID стола в ReMarked
      tableNumber: string;              // Номер стола (для отображения)
      x: number;                        // Позиция X на схеме (в процентах или пикселях)
      y: number;                        // Позиция Y на схеме (в процентах или пикселях)
      capacity?: number;                // Вместимость стола (опционально)
      shape?: 'circle' | 'rectangle';  // Форма стола (опционально)
      width?: number;                   // Ширина стола (опционально)
      height?: number;                  // Высота стола (опционально)
    }>;
  }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
