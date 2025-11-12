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

    const userRepository = AppDataSource.getRepository(User);
    let user = await userRepository.findOne({
      where: { telegramId },
    });

    // Проверяем, является ли пользователь админом по Telegram ID
    const isAdmin = isTelegramAdmin(telegramId);
    console.log('[auth/telegram] Is admin check result:', isAdmin);

    if (!user) {
      // При создании нового пользователя проверяем, является ли он админом
      user = userRepository.create({
        telegramId,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        photoUrl: telegramUser.photo_url,
        role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      });
      await userRepository.save(user);
    } else {
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
      
      await userRepository.save(user);
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
    console.error('Auth error:', error);
    res.status(400).json({ success: false, message: 'Authentication failed' });
  }
});

export default router;
