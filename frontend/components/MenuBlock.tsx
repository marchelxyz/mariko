import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
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
  initialMenuItems?: MenuItem[];
  isGeneralMenu?: boolean;
}

export default function MenuBlock({ restaurantId, initialMenuItems, isGeneralMenu = false }: MenuBlockProps) {
  const { selectedRestaurant, menuItems, menuItemsByRestaurant, setMenuItems } = useStore();
  const router = useRouter();
  const [displayCount, setDisplayCount] = useState(2);
  const [isLoading, setIsLoading] = useState(false);

  // Определяем количество блюд в зависимости от размера экрана
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const getItemsCount = () => {
      const width = window.innerWidth;
      if (width >= 1024) return 6; // lg и больше
      if (width >= 768) return 4; // md
      if (width >= 640) return 3; // sm
      return 2; // мобильные
    };
    
    setDisplayCount(getItemsCount());
    
    const handleResize = () => {
      setDisplayCount(getItemsCount());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Получаем меню из store или загружаем, если его нет
  const currentRestaurantId = restaurantId || selectedRestaurant?.id;
  
  // Если указан конкретный ресторан, используем только его меню из кеша
  // НЕ используем fallback на menuItems, чтобы избежать показа меню другого ресторана
  const cachedMenuItems = currentRestaurantId 
    ? (menuItemsByRestaurant[currentRestaurantId] || [])
    : menuItems;
  
  // Используем предзагруженные элементы меню только если они соответствуют текущему ресторану
  // или если ресторан не указан (общее меню)
  const shouldUseInitialMenuItems = initialMenuItems && initialMenuItems.length > 0 && 
    (!currentRestaurantId || cachedMenuItems.length === 0);
  const menuItemsToUse = cachedMenuItems.length > 0 ? cachedMenuItems : (shouldUseInitialMenuItems ? initialMenuItems : []);

  // Загружаем меню только если его нет в store
  useEffect(() => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;
    
    if (!currentRestaurantId) return;

    // Если меню уже есть в кэше для этого ресторана, не загружаем
    if (menuItemsByRestaurant[currentRestaurantId] && menuItemsByRestaurant[currentRestaurantId].length > 0) {
      setIsLoading(false);
      return;
    }
    
    // Если есть initialMenuItems для текущего ресторана, не делаем запрос
    // Но только если меню для этого ресторана еще не загружено
    if (initialMenuItems && initialMenuItems.length > 0 && 
        !menuItemsByRestaurant[currentRestaurantId]) {
      setIsLoading(false);
      return;
    }

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
        
        // Сохраняем в store
        setMenuItems(allItems, currentRestaurantId);
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId, selectedRestaurant?.id, currentRestaurantId, menuItemsByRestaurant, initialMenuItems, setMenuItems]);

  // Получаем блюда для отображения
  const menuItemsToDisplay = menuItemsToUse.slice(0, displayCount);

  const handleMenuClick = () => {
    const currentRestaurantId = restaurantId || selectedRestaurant?.id;
    if (currentRestaurantId) {
      router.push(`/menu?restaurantId=${currentRestaurantId}`);
    } else {
      router.push('/menu');
    }
  };

  if (isLoading || menuItemsToUse.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg py-6 w-full md:bg-transparent md:py-0">
      {/* Заголовок "Рекомендуем попробовать" с стрелкой */}
      <button
        onClick={handleMenuClick}
        onMouseEnter={() => {
          // Предзагружаем страницу меню при наведении
          router.prefetch('/menu').catch((error) => {
            console.debug('Failed to prefetch /menu:', error);
          });
        }}
        className="flex items-center justify-between w-full mb-4 group px-4 md:px-0"
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
      <div className="px-4 w-full overflow-x-hidden md:px-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 md:justify-items-start">
          {menuItemsToDisplay.map((item) => (
            <div
              key={item.id}
              className="bg-[#F7F7F7] rounded-xl p-3 flex flex-col w-full min-w-0"
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

              {/* Цена - показываем только если это не общее меню */}
              {!isGeneralMenu && item.price && (
                <div className="text-sm font-bold text-black mb-1">
                  {item.price} ₽
                </div>
              )}

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
      </div>
    </div>
  );
}
