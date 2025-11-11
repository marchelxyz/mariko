import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    // В реальном приложении нужно валидировать initData через Telegram
    // Для упрощения здесь базовая реализация
    const telegramUser = JSON.parse(decodeURIComponent(initData));

    let user = await User.findOne({ telegramId: telegramUser.id.toString() });

    if (!user) {
      user = await User.create({
        telegramId: telegramUser.id.toString(),
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        username: telegramUser.username,
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, user });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Authentication failed' });
  }
});

export default router;
