import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ActionButtons from '@/components/ActionButtons';
import Banners from '@/components/Banners';
import MenuBlock from '@/components/MenuBlock';
import { MenuItem } from '@/types/menu';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

interface Restaurant {
  id: string;
  _id?: string;
  name: string;
  city: string;
  address: string;
  phoneNumber: string;
  latitude?: number;
  longitude?: number;
}

// Используем общий тип MenuItem из types/menu.ts

interface HomeProps {
  initialBanners: Banner[];
  initialRestaurants: Restaurant[];
  initialMenuItems: MenuItem[];
  initialSelectedRestaurantId: string | null;
  initialFavoriteRestaurant: Restaurant | null;
  restaurantId?: string;
}

export default function Home({
  initialBanners,
  initialRestaurants,
  initialMenuItems,
  initialSelectedRestaurantId,
  initialFavoriteRestaurant,
  restaurantId,
}: HomeProps) {
  const router = useRouter();
  const {
    selectedRestaurant,
    setBannersForRestaurant,
    setRestaurants,
    setSelectedRestaurant,
    setFavoriteRestaurant,
    setMenuItems,
  } = useStore();

  // Инициализируем store с предзагруженными данными при первом рендере
  useEffect(() => {
    // Инициализируем баннеры
    if (initialBanners && initialBanners.length > 0) {
      const key = restaurantId ? `horizontal_${restaurantId}` : 'horizontal_default';
      setBannersForRestaurant(key, initialBanners);
    }

    // Инициализируем рестораны
    if (initialRestaurants && initialRestaurants.length > 0) {
      setRestaurants(initialRestaurants);
    }

    // Инициализируем любимый ресторан
    // Важно: вызываем setFavoriteRestaurant всегда, даже если null, чтобы очистить старое значение из хранилища
    setFavoriteRestaurant(initialFavoriteRestaurant).catch(console.error);

    // Инициализируем выбранный ресторан
    // Приоритет всегда у избранного ресторана или явно указанного в URL
    if (initialFavoriteRestaurant && initialRestaurants) {
      const favoriteInList = initialRestaurants.find((r) => r.id === initialFavoriteRestaurant.id);
      if (favoriteInList) {
        setSelectedRestaurant(favoriteInList);
      } else if (initialSelectedRestaurantId) {
        // Если избранный ресторан не найден в списке, но есть явно выбранный, используем его
        const restaurant = initialRestaurants.find((r) => r.id === initialSelectedRestaurantId);
        if (restaurant) {
          setSelectedRestaurant(restaurant);
        }
      }
    } else if (restaurantId && initialRestaurants) {
      // Если restaurantId указан в URL, это явный выбор - используем его
      const restaurant = initialRestaurants.find((r) => r.id === restaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    } else if (initialSelectedRestaurantId && initialRestaurants) {
      // Если есть явно выбранный ресторан (из сервера), используем его
      const restaurant = initialRestaurants.find((r) => r.id === initialSelectedRestaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    }

    // Инициализируем меню
    if (initialMenuItems && initialMenuItems.length > 0) {
      // Используем restaurantId только если он явно указан (избранный или из URL)
      // Если ресторан не выбран, бэкенд вернет меню первого ресторана по умолчанию
      const targetRestaurantId = initialSelectedRestaurantId || restaurantId || (initialRestaurants?.[0]?.id) || undefined;
      setMenuItems(initialMenuItems, targetRestaurantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <Header />
      
      {/* Мобильная версия */}
      <div className="md:hidden">
        <ActionButtons />
        <div className="py-6 space-y-6">
          <div className="px-4">
            <Banners restaurantId={selectedRestaurant?.id || restaurantId} initialBanners={initialBanners} />
          </div>
          <MenuBlock 
            restaurantId={selectedRestaurant?.id || restaurantId} 
            initialMenuItems={initialMenuItems}
          />
        </div>
      </div>

      {/* Десктопная версия */}
      <div className="hidden md:block py-6 px-4">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Левая колонка - кнопки, заголовок и блюда */}
          <div className="flex-1 flex flex-col">
            <ActionButtons />
            <MenuBlock 
              restaurantId={selectedRestaurant?.id || restaurantId} 
              initialMenuItems={initialMenuItems}
            />
          </div>

          {/* Правая колонка - баннер */}
          <div className="flex-shrink-0 w-1/3">
            <Banners restaurantId={selectedRestaurant?.id || restaurantId} initialBanners={initialBanners} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Получаем токен из cookies, если он есть
    const token = context.req.cookies.token || context.req.headers.authorization?.replace('Bearer ', '');
    
    // Создаем экземпляр axios для серверного запроса
    const getBaseURL = () => {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const baseURL = url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
      
      // Логируем URL для диагностики
      console.log('[getServerSideProps] API Base URL:', baseURL);
      console.log('[getServerSideProps] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'не установлена');
      
      return baseURL;
    };

    // Используем динамический импорт для axios на сервере
    const axios = (await import('axios')).default;
    const serverApi = axios.create({
      baseURL: getBaseURL(),
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 30000, // 30 секунд таймаут (увеличено для больших меню)
    });

    // Используем эндпоинт для получения полных данных главной страницы
    const { restaurantId } = context.query;
    console.log('[getServerSideProps] Fetching home page data, restaurantId:', restaurantId);
    
    const pageResponse = await serverApi.get('/pages/home', {
      params: restaurantId ? { restaurantId } : {},
    });

    console.log('[getServerSideProps] Response status:', pageResponse.status);
    console.log('[getServerSideProps] Response data keys:', Object.keys(pageResponse.data || {}));

    const pageData = pageResponse.data.data || {};
    const banners = pageData.banners || [];
    const restaurants = pageData.restaurants || [];
    const menuItems = pageData.menuItems || [];
    const selectedRestaurantId = pageData.selectedRestaurantId || null;
    const favoriteRestaurant = pageData.favoriteRestaurant || null;

    console.log('[getServerSideProps] Loaded data:', {
      bannersCount: banners.length,
      restaurantsCount: restaurants.length,
      menuItemsCount: menuItems.length,
      selectedRestaurantId,
      hasFavoriteRestaurant: !!favoriteRestaurant,
    });

    return {
      props: {
        initialBanners: banners,
        initialRestaurants: restaurants,
        initialMenuItems: menuItems,
        initialSelectedRestaurantId: selectedRestaurantId,
        initialFavoriteRestaurant: favoriteRestaurant,
        restaurantId: restaurantId as string || null,
      },
    };
  } catch (error: any) {
    console.error('❌ Error fetching home page data on server:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      } : null,
      request: error.request ? {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      } : null,
      stack: error.stack,
    });
    
    // Дополнительная диагностика
    if (error.code === 'ECONNREFUSED') {
      console.error('🔍 Диагностика: Соединение отклонено на сервере');
      console.error('   Проверьте NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔍 Диагностика: Таймаут запроса на сервере');
    } else if (error.response) {
      console.error('🔍 Диагностика: Сервер вернул ошибку:', error.response.status);
    }
    
    // В случае ошибки возвращаем пустые данные
    return {
      props: {
        initialBanners: [],
        initialRestaurants: [],
        initialMenuItems: [],
        initialSelectedRestaurantId: null,
        initialFavoriteRestaurant: null,
        restaurantId: null,
      },
    };
  }
};
