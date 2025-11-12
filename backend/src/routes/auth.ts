import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { isTelegramAdmin } from '../middleware/auth';

const router = Router();

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    // В реальном приложении нужно валидировать initData через Telegram
    // Для упрощения здесь базовая реализация
    const telegramUser = JSON.parse(decodeURIComponent(initData));
    const telegramId = telegramUser.id.toString();

    const userRepository = AppDataSource.getRepository(User);
    let user = await userRepository.findOne({
      where: { telegramId },
    });

    // Проверяем, является ли пользователь админом по Telegram ID
    const isAdmin = isTelegramAdmin(telegramId);

    if (!user) {
      // При создании нового пользователя проверяем, является ли он админом
      user = userRepository.create({
        telegramId,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      });
      await userRepository.save(user);
    } else {
      // Обновляем данные пользователя и проверяем админский статус
      user.firstName = telegramUser.first_name || user.firstName;
      user.lastName = telegramUser.last_name || user.lastName;
      user.username = telegramUser.username || user.username;
      
      // Если пользователь в списке админов, устанавливаем роль admin
      if (isAdmin && user.role !== UserRole.ADMIN) {
        user.role = UserRole.ADMIN;
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
