import { useState } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Image from 'next/image';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  calories?: number;
}

interface MenuProps {
  initialMenuItems: Record<string, MenuItem[]>;
  restaurantId: string;
}

const CATEGORIES = [
  'Закуски',
  'Салаты',
  'Горячее',
  'Шашлык',
  'Выпечка',
  'Напитки',
  'Бар',
  'Детское',
];

export default function Menu({ initialMenuItems, restaurantId }: MenuProps) {
  const router = useRouter();
  const { selectedRestaurant } = useStore();
  const [menuItems] = useState<Record<string, MenuItem[]>>(initialMenuItems);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Используем restaurantId из props или из store
  const currentRestaurantId = selectedRestaurant?.id || restaurantId;


  // Фильтруем категории, которые есть в меню
  const availableCategories = CATEGORIES.filter(
    (cat) => menuItems[cat] && menuItems[cat].length > 0
  );

  // Если выбрана категория, показываем только её, иначе показываем все
  const categoriesToShow = selectedCategory
    ? [selectedCategory]
    : availableCategories.length > 0
    ? availableCategories
    : Object.keys(menuItems).filter((cat) => menuItems[cat] && menuItems[cat].length > 0);

  // Получаем все блюда для отображения в сетке
  const allItemsToShow: MenuItem[] = [];
  categoriesToShow.forEach((category) => {
    const items = menuItems[category] || [];
    allItemsToShow.push(...items);
  });

  return (
    <Layout>
      <Header title="Меню" />
      <div className="px-4 py-6 space-y-6">
        {/* Кнопка назад */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-text-primary hover:opacity-80 transition-opacity"
          aria-label="Назад на главную"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-text-primary"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-medium">Назад</span>
        </button>

        {/* Фильтр категорий */}
        {availableCategories.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-primary hover:bg-gray-200'
                }`}
              >
                Все
              </button>
              {availableCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-primary hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Меню в виде сетки карточек */}
        {allItemsToShow.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Меню пока пусто</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {allItemsToShow.map((item) => (
              <div
                key={item.id}
                className="bg-[#F7F7F7] rounded-xl p-3 flex flex-col"
              >
                {/* Фото блюда */}
                {item.imageUrl ? (
                  <div
                    className="w-full rounded-lg overflow-hidden mb-3"
                    style={{
                      aspectRatio: '4/3',
                      position: 'relative',
                    }}
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full rounded-lg bg-[#E5E5E5] flex items-center justify-center mb-3"
                    style={{
                      aspectRatio: '4/3',
                    }}
                  >
                    <span className="text-3xl">🍽️</span>
                  </div>
                )}

                {/* Цена */}
                <div className="text-sm font-bold text-black mb-1">
                  {item.price} ₽
                </div>

                {/* Название блюда */}
                <div className="text-sm font-medium text-black mb-1 line-clamp-2">
                  {item.name}
                </div>

                {/* Калорийность */}
                {item.calories && (
                  <div className="text-xs font-normal text-[rgba(27,31,59,0.4)] mt-auto">
                    {item.calories} ккал
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const { restaurantId } = context.query;

    if (!restaurantId || typeof restaurantId !== 'string') {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

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

    // Используем новый эндпоинт для получения полных данных страницы меню с кэшированием
    const pageResponse = await serverApi.get(`/pages/menu/${restaurantId}`);

    const pageData = pageResponse.data.data || {};
    const menuItems = pageData.menuItems || {};

    return {
      props: {
        initialMenuItems: menuItems,
        restaurantId,
      },
    };
  } catch (error) {
    console.error('Error fetching menu page data on server:', error);
    
    // Если ресторан не найден, редиректим на главную
    if ((error as any)?.response?.status === 404) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    // В случае другой ошибки возвращаем пустое меню
    return {
      props: {
        initialMenuItems: {},
        restaurantId: context.query.restaurantId as string || '',
      },
    };
  }
};
