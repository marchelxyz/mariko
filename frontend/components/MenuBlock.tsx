import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  calories?: number;
}

interface MenuBlockProps {
  restaurantId?: string;
}

export default function MenuBlock({ restaurantId }: MenuBlockProps) {
  const { selectedRestaurant } = useStore();
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;
    
    const currentRestaurantId = restaurantId || selectedRestaurant?.id;
    if (!currentRestaurantId) return;

    const fetchMenu = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/menu/${currentRestaurantId}`);
        const groupedMenu = response.data.data || {};
        
        // Преобразуем группированное меню в плоский массив всех блюд
        const allItems: MenuItem[] = [];
        Object.values(groupedMenu).forEach((categoryItems: any) => {
          if (Array.isArray(categoryItems)) {
            allItems.push(...categoryItems);
          }
        });
        
        // Берем первые 2 позиции
        setMenuItems(allItems.slice(0, 2));
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId, selectedRestaurant]);

  const handleMenuClick = () => {
    router.push('/menu');
  };

  if (isLoading || menuItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg px-4 py-6">
      {/* Заголовок "Рекомендуем попробовать" с стрелкой */}
      <button
        onClick={handleMenuClick}
        className="flex items-center justify-between w-full mb-4 group"
      >
        <span className="text-[#000000] font-normal text-base">Рекомендуем попробовать</span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-gray-500 group-hover:text-gray-700 transition-colors"
        >
          <path
            d="M9 18L15 12L9 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Блюда */}
      <div className="flex gap-4">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0"
            style={{ width: '180px' }}
          >
            {/* Подложка */}
            <div
              className="relative"
              style={{
                width: '180px',
                height: '196px',
                backgroundColor: '#F7F7F7',
                borderRadius: '12px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Фото блюда */}
              {item.imageUrl ? (
                <div
                  style={{
                    width: '100%',
                    borderRadius: '15px',
                    overflow: 'hidden',
                    position: 'relative',
                    aspectRatio: '4/3',
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    borderRadius: '15px',
                    backgroundColor: '#E5E5E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    aspectRatio: '4/3',
                  }}
                >
                  <span className="text-3xl">🍽️</span>
                </div>
              )}
            </div>

            {/* Цена */}
            <div
              style={{
                marginTop: '3px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#000000',
              }}
            >
              {item.price} ₽
            </div>

            {/* Название блюда */}
            <div
              style={{
                marginTop: '2px',
                fontSize: '14px',
                fontWeight: 500, // Medium
                color: '#000000',
              }}
            >
              {item.name}
            </div>

            {/* Калорийность */}
            {item.calories && (
              <div
                style={{
                  marginTop: '2px',
                  fontSize: '12px',
                  fontWeight: 'normal',
                  color: 'rgba(27, 31, 59, 0.4)', // #1B1F3B с прозрачностью 40%
                }}
              >
                {item.calories} ккал
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
