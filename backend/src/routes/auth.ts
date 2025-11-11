import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';

const router = Router();

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    // В реальном приложении нужно валидировать initData через Telegram
    // Для упрощения здесь базовая реализация
    const telegramUser = JSON.parse(decodeURIComponent(initData));

    const userRepository = AppDataSource.getRepository(User);
    let user = await userRepository.findOne({
      where: { telegramId: telegramUser.id.toString() },
    });

    if (!user) {
      user = userRepository.create({
        telegramId: telegramUser.id.toString(),
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
        role: UserRole.USER,
      });
      await userRepository.save(user);
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
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
