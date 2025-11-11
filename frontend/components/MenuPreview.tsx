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
}

interface MenuPreviewProps {
  restaurantId?: string;
}

export default function MenuPreview({ restaurantId }: MenuPreviewProps) {
  const { selectedRestaurant } = useStore();
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;
    if (!restaurantId) return;

    const fetchMenu = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/menu/${restaurantId}`);
        setMenuItems(response.data.data || {});
      } catch (error) {
        console.error('Failed to fetch menu:', error);
        // Не показываем ошибку пользователю
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId]);

  if (!restaurantId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-text-primary">Выберите ресторан для просмотра меню</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-text-primary">Загрузка меню...</p>
      </div>
    );
  }

  if (Object.keys(menuItems).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <p className="text-text-primary">Меню пока пусто</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">Меню</h2>
        {selectedRestaurant && (
          <button
            onClick={() => router.push('/menu')}
            className="text-primary text-sm font-medium"
          >
            Смотреть все
          </button>
        )}
      </div>

      {Object.entries(menuItems).slice(0, 2).map(([category, items]) => (
        <div key={category} className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold text-text-primary mb-3">{category}</h3>
          <div className="space-y-3">
            {items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-secondary rounded-md flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🍽️</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary">{item.name}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                  <p className="text-primary font-semibold mt-1">{item.price} ₽</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
