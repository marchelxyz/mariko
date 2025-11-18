import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

export default function TelegramAuth() {
  const router = useRouter();
  const { setToken, setUser, fetchProfile, fetchFavoriteRestaurant } = useStore();

  useEffect(() => {
    const initTelegramAuth = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Проверяем, есть ли токен в localStorage
        const existingToken = localStorage.getItem('token');
        const { user } = useStore.getState();
        
        // Если токен есть, но пользователь не загружен, загружаем профиль
        if (existingToken && !user) {
          try {
            await fetchProfile();
            // Загружаем любимый ресторан после загрузки профиля
            await fetchFavoriteRestaurant();
          } catch (error) {
            console.error('Failed to fetch profile with existing token:', error);
            // Если токен невалидный, удаляем его
            if (error && typeof error === 'object' && 'response' in error) {
              const axiosError = error as any;
              if (axiosError.response?.status === 401) {
                localStorage.removeItem('token');
                setToken(null);
              }
            }
          }
        }

        // Динамический импорт SDK только на клиенте
        const { default: WebApp } = await import('@twa-dev/sdk');
        
        // Получаем initData из Telegram WebApp через SDK
        const initData = WebApp.initData || (window as any).Telegram?.WebApp?.initData;
        
        // Также пытаемся получить данные пользователя напрямую из SDK
        const userData = WebApp.initDataUnsafe?.user || (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        
        if (initData) {
          // Если есть данные пользователя напрямую, добавляем их к initData
          let dataToSend = initData;
          if (userData && typeof initData === 'string') {
            // Если initData - строка, пытаемся добавить photo_url если его нет
            try {
              const params = new URLSearchParams(initData);
              const userParam = params.get('user');
              if (userParam && userData.photo_url) {
                const userObj = JSON.parse(decodeURIComponent(userParam));
                if (!userObj.photo_url && userData.photo_url) {
                  userObj.photo_url = userData.photo_url;
                  params.set('user', encodeURIComponent(JSON.stringify(userObj)));
                  dataToSend = params.toString();
                }
              }
            } catch (e) {
              // Если не удалось обработать, отправляем как есть
            }
          }
          
          const response = await api.post('/auth/telegram', { initData: dataToSend });
          if (response.data.success) {
            setToken(response.data.token);
            setUser(response.data.user);
            // Загружаем актуальные данные профиля, чтобы убедиться, что роль обновлена
            try {
              await fetchProfile();
              // Загружаем любимый ресторан после авторизации
              await fetchFavoriteRestaurant();
            } catch (error) {
              console.error('Failed to fetch profile after auth:', error);
            }
          }
        }
      } catch (error) {
        console.error('Telegram auth failed:', error);
      }
    };

    initTelegramAuth();
  }, [setToken, setUser, fetchProfile, fetchFavoriteRestaurant]);

  return null;
}
