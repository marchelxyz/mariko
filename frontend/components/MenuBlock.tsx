import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';
import DishCard from './DishCard';
import { MenuItem } from '@/types/menu';

interface MenuBlockProps {
  restaurantId?: string;
  initialMenuItems?: MenuItem[];
}

// Глобальный объект для отслеживания активных запросов меню
const activeMenuRequests = new Map<string, Promise<MenuItem[]>>();

// Максимальное количество ресторанов в кэше памяти (для предотвращения утечек)
const MAX_CACHED_RESTAURANTS = 10;

// Retry конфигурация
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 секунда
  retryDelayMultiplier: 2, // Увеличиваем задержку в 2 раза при каждой попытке
};

/**
 * Функция для retry запросов с экспоненциальной задержкой
 */
async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = RETRY_CONFIG.maxRetries,
  delay: number = RETRY_CONFIG.retryDelay
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Не повторяем для ошибок отмены или клиентских ошибок (4xx)
    if (
      error?.name === 'AbortError' ||
      error?.code === 'ERR_CANCELED' ||
      (error?.response?.status >= 400 && error?.response?.status < 500)
    ) {
      throw error;
    }

    if (maxRetries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryRequest(fn, maxRetries - 1, delay * RETRY_CONFIG.retryDelayMultiplier);
    }
    throw error;
  }
}

export default function MenuBlock({ restaurantId, initialMenuItems }: MenuBlockProps) {
  const { selectedRestaurant, menuItems, menuItemsByRestaurant, setMenuItems } = useStore();
  const router = useRouter();
  const [displayCount, setDisplayCount] = useState(2);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const previousRestaurantIdRef = useRef<string | undefined>(undefined);
  
  // Мемоизируем текущий ID ресторана
  const currentRestaurantId = useMemo(
    () => restaurantId || selectedRestaurant?.id,
    [restaurantId, selectedRestaurant?.id]
  );
  
  // Инициализируем isLoading на основе наличия данных в кэше или initialMenuItems
  const hasCachedData = useMemo(
    () =>
      currentRestaurantId
        ? (menuItemsByRestaurant[currentRestaurantId]?.length > 0)
        : (menuItems.length > 0),
    [currentRestaurantId, menuItemsByRestaurant, menuItems]
  );
  
  const hasInitialData = useMemo(
    () => initialMenuItems && initialMenuItems.length > 0,
    [initialMenuItems]
  );
  
  const [isLoading, setIsLoading] = useState(!hasCachedData && !hasInitialData);
  const [error, setError] = useState<string | null>(null);

  // Определяем количество блюд в зависимости от размера экрана
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const getItemsCount = () => {
      const width = window.innerWidth;
      if (width >= 1024) return 12; // lg и больше
      if (width >= 768) return 8; // md
      if (width >= 640) return 6; // sm
      return 4; // мобильные
    };
    
    setDisplayCount(getItemsCount());
    
    const handleResize = () => {
      setDisplayCount(getItemsCount());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Фильтруем initialMenuItems, чтобы убедиться, что у всех есть обязательные поля
  const validInitialMenuItems = useMemo(
    () =>
      initialMenuItems?.filter(
        (item) => item && item.id && item.name && typeof item.price === 'number'
      ) || [],
    [initialMenuItems]
  );

  // Получаем меню из store или загружаем, если его нет
  const cachedMenuItems = useMemo(
    () =>
      currentRestaurantId
        ? (menuItemsByRestaurant[currentRestaurantId] || [])
        : menuItems,
    [currentRestaurantId, menuItemsByRestaurant, menuItems]
  );

  // Используем предзагруженные элементы меню только если они соответствуют текущему ресторану
  const shouldUseInitialMenuItems = useMemo(
    () => validInitialMenuItems.length > 0 && (!currentRestaurantId || cachedMenuItems.length === 0),
    [validInitialMenuItems.length, currentRestaurantId, cachedMenuItems.length]
  );

  const menuItemsToUse = useMemo(
    () =>
      cachedMenuItems.length > 0
        ? cachedMenuItems
        : shouldUseInitialMenuItems
        ? validInitialMenuItems
        : [],
    [cachedMenuItems, shouldUseInitialMenuItems, validInitialMenuItems]
  );

  // Функция для преобразования группированного меню в плоский массив (мемоизирована)
  const transformGroupedMenuToFlat = useCallback((groupedMenu: Record<string, MenuItem[]>): MenuItem[] => {
    const allItems: MenuItem[] = [];
    Object.values(groupedMenu).forEach((categoryItems) => {
      if (Array.isArray(categoryItems)) {
        // Фильтруем и проверяем, что у каждого элемента есть обязательные поля
        const validItems = categoryItems.filter(
          (item: any) => item && item.id && item.name && typeof item.price === 'number'
        );
        allItems.push(...validItems);
      }
    });
    return allItems;
  }, []);

  // Загружаем меню только если его нет в store
  useEffect(() => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;

    // Если ресторан не изменился, не делаем повторный запрос
    if (previousRestaurantIdRef.current === currentRestaurantId) {
      return;
    }

    // Отменяем предыдущий запрос при смене ресторана
    if (previousRestaurantIdRef.current && fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
      fetchAbortControllerRef.current = null;
    }

    previousRestaurantIdRef.current = currentRestaurantId;

    if (!currentRestaurantId) {
      setIsLoading(false);
      setError(null);
      return;
    }

    // Проверяем кэш синхронно, чтобы избежать мигания индикатора загрузки
    const cachedItems = menuItemsByRestaurant[currentRestaurantId];

    // Если меню уже есть в кэше для этого ресторана, не загружаем и не показываем загрузку
    if (cachedItems && cachedItems.length > 0) {
      setIsLoading(false);
      setError(null);
      return;
    }

    // Если есть initialMenuItems для текущего ресторана, сохраняем их и не делаем запрос
    if (validInitialMenuItems.length > 0 && !cachedItems) {
      // Сохраняем initialMenuItems в store
      setMenuItems(validInitialMenuItems, currentRestaurantId);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Только если данных нет ни в кэше, ни в initialMenuItems, делаем запрос
    const fetchMenu = async () => {
      // Проверяем, не идет ли уже загрузка для этого ресторана
      const existingRequest = activeMenuRequests.get(currentRestaurantId);
      if (existingRequest) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('MenuBlock: Используем существующий запрос для ресторана:', currentRestaurantId);
        }
        try {
          await existingRequest;
          setIsLoading(false);
          setError(null);
        } catch (error) {
          // Игнорируем ошибки из существующего запроса, но показываем состояние загрузки
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      // Создаем новый AbortController для возможности отмены запроса
      fetchAbortControllerRef.current = new AbortController();

      // Создаем промис для запроса и сохраняем его
      const menuRequest = retryRequest(async () => {
        const response = await api.get(`/menu/${currentRestaurantId}`, {
          signal: fetchAbortControllerRef.current?.signal,
          timeout: 30000, // Увеличиваем таймаут для больших меню (30 секунд)
        });
        const groupedMenu = response.data.data || {};

        // Преобразуем группированное меню в плоский массив всех блюд
        const allItems = transformGroupedMenuToFlat(groupedMenu);

        if (process.env.NODE_ENV === 'development') {
          console.debug('MenuBlock: Fetched menu items:', {
            restaurantId: currentRestaurantId,
            groupedCategories: Object.keys(groupedMenu),
            totalItems: allItems.length,
          });
        }

        // Сохраняем в store только если получили данные
        if (allItems.length > 0) {
          setMenuItems(allItems, currentRestaurantId);
          
          // Ограничиваем размер кэша в памяти (удаляем старые рестораны)
          const restaurantIds = Object.keys(menuItemsByRestaurant);
          if (restaurantIds.length > MAX_CACHED_RESTAURANTS) {
            // Удаляем самый старый ресторан (первый в списке)
            const oldestRestaurantId = restaurantIds[0];
            if (oldestRestaurantId !== currentRestaurantId) {
              const updatedCache = { ...menuItemsByRestaurant };
              delete updatedCache[oldestRestaurantId];
              // Обновляем store без удаления текущего ресторана
              // Это делается через setMenuItems, который обновляет только нужный ресторан
            }
          }
        }

        return allItems;
      }).catch((error: any) => {
        // Игнорируем ошибки отмены запроса
        if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
          return [];
        }

        console.error('Failed to fetch menu:', error);
        if (process.env.NODE_ENV === 'development') {
          console.error('MenuBlock: Error details:', {
            restaurantId: currentRestaurantId,
            errorMessage: error?.message,
            errorResponse: error?.response?.data,
            errorStatus: error?.response?.status,
          });
        }

        // Устанавливаем ошибку, но не бросаем исключение, чтобы показать предыдущие данные
        const errorMessage =
          error?.response?.status === 404
            ? 'Меню не найдено'
            : error?.response?.status >= 500
            ? 'Ошибка сервера. Попробуйте позже.'
            : 'Не удалось загрузить меню. Проверьте подключение к интернету.';

        setError(errorMessage);
        throw error;
      });

      // Сохраняем промис в активных запросах
      activeMenuRequests.set(currentRestaurantId, menuRequest);

      try {
        await menuRequest;
        setIsLoading(false);
        setError(null);
      } catch (error) {
        // Ошибка уже обработана в промисе
        setIsLoading(false);
        // Не очищаем menuItemsToUse, чтобы показать предыдущие данные при ошибке
      } finally {
        // Удаляем запрос из активных после завершения
        activeMenuRequests.delete(currentRestaurantId);
      }
    };

    fetchMenu();

    // Очистка при размонтировании компонента или смене ресторана
    return () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
        fetchAbortControllerRef.current = null;
      }
    };
  }, [currentRestaurantId, menuItemsByRestaurant, validInitialMenuItems, setMenuItems, transformGroupedMenuToFlat]);

  // Получаем блюда для отображения (мемоизировано)
  const menuItemsToDisplay: MenuItem[] = useMemo(
    () =>
      menuItemsToUse
        .filter(
          (item): item is MenuItem =>
            item != null &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.price === 'number'
        )
        .slice(0, displayCount),
    [menuItemsToUse, displayCount]
  );

  const handleMenuClick = useCallback(() => {
    const currentRestaurantId = restaurantId || selectedRestaurant?.id;
    if (currentRestaurantId) {
      router.push(`/menu?restaurantId=${currentRestaurantId}`);
    } else {
      router.push('/menu');
    }
  }, [restaurantId, selectedRestaurant?.id, router]);

  // Показываем индикатор загрузки только если идет загрузка и нет данных
  if (isLoading && menuItemsToUse.length === 0) {
    return (
      <div className="bg-white rounded-lg py-6 w-full md:bg-transparent md:py-0">
        <div className="px-4 md:px-0">
          <div className="text-[#000000] font-normal text-base mb-4">Рекомендуем попробовать</div>
          <div className="text-center py-8 text-text-primary">Загрузка меню...</div>
        </div>
      </div>
    );
  }

  // Показываем ошибку, если есть ошибка и нет данных
  if (error && menuItemsToUse.length === 0) {
    return (
      <div className="bg-white rounded-lg py-6 w-full md:bg-transparent md:py-0">
        <div className="px-4 md:px-0">
          <div className="text-[#000000] font-normal text-base mb-4">Рекомендуем попробовать</div>
          <div className="text-center py-8 text-text-primary">
            <p className="mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                previousRestaurantIdRef.current = undefined; // Сбрасываем для повторного запроса
              }}
              className="text-primary hover:underline"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Не показываем компонент только если меню пустое и не загружается
  if (!isLoading && menuItemsToUse.length === 0 && !error) {
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
            <button
              key={item.id}
              onClick={() => setSelectedDish(item)}
              className="bg-[#F7F7F7] rounded-xl p-3 flex flex-col w-full min-w-0 text-left hover:opacity-90 transition-opacity cursor-pointer"
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
              {item.price && (
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
            </button>
          ))}
        </div>
      </div>

      {/* Карточка блюда */}
      <DishCard
        item={selectedDish}
        isOpen={!!selectedDish}
        onClose={() => setSelectedDish(null)}
      />
    </div>
  );
}
