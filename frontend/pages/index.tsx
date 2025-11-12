import { useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ActionButtons from '@/components/ActionButtons';
import Banners from '@/components/Banners';
import MenuPreview from '@/components/MenuPreview';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

interface HomeProps {
  initialBanners: Banner[];
  restaurantId?: string;
}

export default function Home({ initialBanners, restaurantId }: HomeProps) {
  const { selectedRestaurant, fetchRestaurants, setBannersForRestaurant } = useStore();

  // Инициализируем store с предзагруженными баннерами при первом рендере
  useEffect(() => {
    if (initialBanners && initialBanners.length > 0) {
      const key = restaurantId || 'default';
      setBannersForRestaurant(key, initialBanners);
    }
  }, [initialBanners, restaurantId, setBannersForRestaurant]);

  useEffect(() => {
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <Header />
      <ActionButtons />
      <div className="px-4 py-6 space-y-6">
        <Banners restaurantId={selectedRestaurant?.id || restaurantId} initialBanners={initialBanners} />
        <MenuPreview restaurantId={selectedRestaurant?.id || restaurantId} />
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

    // Загружаем баннеры для дефолтного ресторана (без restaurantId)
    // Это баннеры, которые показываются всем пользователям
    const bannersResponse = await serverApi.get('/banners', {
      params: {}, // Без restaurantId - получаем общие баннеры
    });

    const banners = bannersResponse.data.data || [];

    return {
      props: {
        initialBanners: banners,
        restaurantId: null,
      },
    };
  } catch (error) {
    console.error('Error fetching banners on server:', error);
    // В случае ошибки возвращаем пустой массив баннеров
    return {
      props: {
        initialBanners: [],
        restaurantId: null,
      },
    };
  }
};
