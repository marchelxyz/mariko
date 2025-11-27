import { useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ActionButtons from '@/components/ActionButtons';
import Banners from '@/components/Banners';
import MenuBlock from '@/components/MenuBlock';

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
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  calories?: number;
}

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
    if (initialFavoriteRestaurant) {
      setFavoriteRestaurant(initialFavoriteRestaurant);
    }

    // Инициализируем выбранный ресторан
    if (initialSelectedRestaurantId) {
      const restaurant = initialRestaurants?.find((r) => r.id === initialSelectedRestaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
      }
    } else if (initialRestaurants && initialRestaurants.length > 0) {
      // Если нет выбранного ресторана, выбираем первый
      setSelectedRestaurant(initialRestaurants[0]);
    }

    // Инициализируем меню
    if (initialMenuItems && initialMenuItems.length > 0) {
      const targetRestaurantId = initialSelectedRestaurantId || restaurantId || initialRestaurants?.[0]?.id;
      setMenuItems(initialMenuItems, targetRestaurantId || undefined);
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
          <MenuBlock restaurantId={selectedRestaurant?.id || restaurantId} />
        </div>
      </div>

      {/* Десктопная версия */}
      <div className="hidden md:block py-6 px-4">
        <div className="flex gap-6 max-w-7xl mx-auto">
          {/* Левая колонка - кнопки, заголовок и блюда */}
          <div className="flex-1 flex flex-col">
            <ActionButtons />
            <MenuBlock restaurantId={selectedRestaurant?.id || restaurantId} />
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
      return url.endsWith('/api') ? url : `${url.replace(/\/$/, '')}/api`;
    };

    // Используем динамический импорт для axios на сервере
    const axios = (await import('axios')).default;
    const serverApi = axios.create({
      baseURL: getBaseURL(),
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 10000,
    });

    // Используем эндпоинт для получения полных данных главной страницы
    const { restaurantId } = context.query;
    const pageResponse = await serverApi.get('/pages/home', {
      params: restaurantId ? { restaurantId } : {},
    });

    const pageData = pageResponse.data.data || {};
    const banners = pageData.banners || [];
    const restaurants = pageData.restaurants || [];
    const menuItems = pageData.menuItems || [];
    const selectedRestaurantId = pageData.selectedRestaurantId || null;
    const favoriteRestaurant = pageData.favoriteRestaurant || null;

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
  } catch (error) {
    console.error('Error fetching home page data on server:', error);
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
