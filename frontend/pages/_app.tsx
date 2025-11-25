import { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useStore } from '@/store/useStore';
import '../styles/globals.css';

// Динамический импорт TelegramAuth только на клиенте
const TelegramAuth = dynamic(() => import('@/components/TelegramAuth'), {
  ssr: false,
});

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { selectedRestaurant, prefetchBanners, fetchRestaurants } = useStore();

  useEffect(() => {
    setMounted(true);
    // Инициализация WebApp только на клиенте
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk').then(({ default: WebApp }) => {
        WebApp.ready();
        // Разворачиваем приложение на полный экран
        WebApp.expand();
      }).catch((error) => {
        console.warn('Telegram WebApp SDK not available:', error);
      });
    }
  }, []);

  // Предзагрузка баннеров при инициализации приложения
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    // Загружаем рестораны, если они еще не загружены
    fetchRestaurants().then(() => {
      // После загрузки ресторанов предзагружаем баннеры для выбранного ресторана
      const restaurantId = selectedRestaurant?.id;
      prefetchBanners(restaurantId);
    });
  }, [mounted, fetchRestaurants, selectedRestaurant, prefetchBanners]);

  // Предзагрузка баннеров при переключении на главную страницу
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const handleRouteChangeStart = (url: string) => {
      // Если переходим на главную страницу, предзагружаем баннеры
      if (url === '/' || url === '/index') {
        const restaurantId = selectedRestaurant?.id;
        prefetchBanners(restaurantId);
      }
    };

    // Предзагружаем баннеры при изменении выбранного ресторана
    const restaurantId = selectedRestaurant?.id;
    if (restaurantId) {
      prefetchBanners(restaurantId);
    }

    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [mounted, router, selectedRestaurant, prefetchBanners]);

  return (
    <>
      {mounted && <TelegramAuth />}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
