import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { isTelegramAdmin } from '../middleware/auth';

const router = Router();

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    // Парсим initData из Telegram WebApp
    // initData может быть строкой с параметрами или уже объектом
    let telegramUser: any;
    
    if (typeof initData === 'string') {
      // Если initData - строка, пытаемся извлечь user параметр
      try {
        // Пробуем распарсить как JSON
        telegramUser = JSON.parse(decodeURIComponent(initData));
      } catch {
        // Если не JSON, пытаемся извлечь из query string
        const params = new URLSearchParams(initData);
        const userParam = params.get('user');
        if (userParam) {
          telegramUser = JSON.parse(decodeURIComponent(userParam));
        } else {
          // Если нет параметра user, пробуем распарсить всю строку как JSON
          telegramUser = JSON.parse(initData);
        }
      }
    } else {
      telegramUser = initData;
    }

    const telegramId = telegramUser.id.toString();
    console.log('[auth/telegram] Received Telegram ID:', telegramId);
    console.log('[auth/telegram] Full telegramUser object:', JSON.stringify(telegramUser, null, 2));

    // Проверяем подключение к БД
    if (!AppDataSource.isInitialized) {
      console.error('[auth/telegram] Database is not initialized!');
      throw new Error('Database connection not initialized');
    }

    const userRepository = AppDataSource.getRepository(User);
    let user = await userRepository.findOne({
      where: { telegramId },
    });

    console.log('[auth/telegram] User lookup result:', user ? `Found user ${user.id}` : 'User not found');

    // Проверяем, является ли пользователь админом по Telegram ID
    const isAdmin = isTelegramAdmin(telegramId);
    console.log('[auth/telegram] Is admin check result:', isAdmin);

    if (!user) {
      console.log('[auth/telegram] Creating new user...');
      
      // Валидация обязательных полей
      if (!telegramId || telegramId.trim() === '') {
        throw new Error('Telegram ID is required');
      }
      
      // При создании нового пользователя проверяем, является ли он админом
      const userData = {
        telegramId: telegramId.trim(),
        firstName: telegramUser.first_name || null,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        photoUrl: telegramUser.photo_url || null,
        role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      };
      
      console.log('[auth/telegram] User data to create:', JSON.stringify(userData, null, 2));
      
      user = userRepository.create(userData);
      
      console.log('[auth/telegram] User object before save:', JSON.stringify({
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
      }, null, 2));
      
      try {
        console.log('[auth/telegram] Attempting to save user to database...');
        const savedUser = await userRepository.save(user);
        console.log('[auth/telegram] User saved successfully. Saved user ID:', savedUser.id);
        console.log('[auth/telegram] Saved user telegramId:', savedUser.telegramId);
        
        // Проверяем, что пользователь действительно сохранился
        console.log('[auth/telegram] Verifying user was saved...');
        const verifyUser = await userRepository.findOne({
          where: { telegramId },
        });
        if (!verifyUser) {
          console.error('[auth/telegram] ERROR: User was not saved to database!');
          console.error('[auth/telegram] Searched for telegramId:', telegramId);
          
          // Попробуем найти пользователя по ID
          const userById = await userRepository.findOne({
            where: { id: savedUser.id },
          });
          if (userById) {
            console.error('[auth/telegram] User found by ID but not by telegramId. Possible index issue.');
          } else {
            console.error('[auth/telegram] User not found by ID either. Save operation failed silently.');
          }
          
          throw new Error('Failed to save user to database');
        }
        console.log('[auth/telegram] User verification successful. Verified user ID:', verifyUser.id);
        console.log('[auth/telegram] Verified user telegramId:', verifyUser.telegramId);
        user = verifyUser;
      } catch (saveError) {
        console.error('[auth/telegram] Error saving user:', saveError);
        if (saveError instanceof Error) {
          console.error('[auth/telegram] Error details:', saveError.message);
          console.error('[auth/telegram] Error stack:', saveError.stack);
        }
        throw saveError;
      }
    } else {
      console.log('[auth/telegram] Updating existing user...');
      // Обновляем данные пользователя и проверяем админский статус
      user.firstName = telegramUser.first_name || user.firstName;
      user.lastName = telegramUser.last_name || user.lastName;
      user.username = telegramUser.username || user.username;
      // Обновляем фото, если оно есть в данных
      if (telegramUser.photo_url) {
        user.photoUrl = telegramUser.photo_url;
      }
      
      // Если пользователь в списке админов, устанавливаем роль admin
      if (isAdmin && user.role !== UserRole.ADMIN) {
        console.log('[auth/telegram] Updating user role to ADMIN');
        user.role = UserRole.ADMIN;
      } else if (isAdmin) {
        console.log('[auth/telegram] User is already admin');
      } else {
        console.log('[auth/telegram] User is not admin, current role:', user.role);
      }
      
      try {
        const savedUser = await userRepository.save(user);
        console.log('[auth/telegram] User updated successfully:', savedUser.id);
        user = savedUser;
      } catch (saveError) {
        console.error('[auth/telegram] Error updating user:', saveError);
        if (saveError instanceof Error) {
          console.error('[auth/telegram] Error details:', saveError.message);
          console.error('[auth/telegram] Error stack:', saveError.stack);
        }
        throw saveError;
      }
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    // Используем актуальную роль пользователя для токена
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, user });
  } catch (error) {
    console.error('[auth/telegram] Auth error:', error);
    if (error instanceof Error) {
      console.error('[auth/telegram] Error message:', error.message);
      console.error('[auth/telegram] Error stack:', error.stack);
      
      // Проверяем специфичные ошибки БД
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        console.error('[auth/telegram] Duplicate key error - user might already exist');
        return res.status(409).json({ 
          success: false, 
          message: 'User already exists',
          error: error.message 
        });
      }
      
      if (error.message.includes('Database connection')) {
        console.error('[auth/telegram] Database connection error');
        return res.status(503).json({ 
          success: false, 
          message: 'Database connection error',
          error: error.message 
        });
      }
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Тестовый эндпоинт для проверки пользователей в БД (только для отладки)
router.get('/debug/users', async (req: Request, res: Response) => {
  try {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ 
        success: false, 
        message: 'Database not initialized' 
      });
    }

    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find({
      order: { createdAt: 'DESC' },
      take: 50, // Ограничиваем до 50 пользователей
    });

    console.log(`[auth/debug] Found ${users.length} users in database`);

    res.json({
      success: true,
      count: users.length,
      users: users.map(u => ({
        id: u.id,
        telegramId: u.telegramId,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error('[auth/debug] Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
