import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

interface VerticalBannersProps {
  restaurantId?: string;
  initialBanners?: Banner[];
}

export default function VerticalBanners({ restaurantId, initialBanners }: VerticalBannersProps) {
  const { bannersByRestaurant, setBannersForRestaurant } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  
  // Фиксированные размеры: высота двух кнопок (120px каждая) + gap (12px) = 252px
  const BANNER_HEIGHT = 252;
  // Ширина баннера: соотношение сторон 3/4, поэтому ширина = высота * 3/4 = 189px
  // Но учитывая ограничение контейнера 160px, делаем баннер 120px шириной
  const BANNER_WIDTH = 120;

  // Получаем баннеры из кэша для конкретного ресторана
  const key = restaurantId ? `vertical_${restaurantId}` : 'vertical_default';
  const cachedBanners = bannersByRestaurant[key] || [];
  
  // Используем предзагруженные баннеры, если они есть и кэш пуст
  const banners = cachedBanners.length > 0 ? cachedBanners : (initialBanners || []);

  useEffect(() => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;

    const loadBanners = async () => {
      const key = restaurantId ? `vertical_${restaurantId}` : 'vertical_default';
      const cachedBanners = bannersByRestaurant[key];
      
      // Если баннеры уже есть в кэше или есть initialBanners, не показываем загрузку
      if (cachedBanners && cachedBanners.length > 0) {
        setIsLoading(false);
        return;
      }
      
      // Если есть initialBanners, не делаем запрос
      if (initialBanners && initialBanners.length > 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Загружаем вертикальные баннеры через API
        const response = await api.get('/banners', {
          params: {
            type: 'vertical',
            ...(restaurantId && { restaurantId }),
          },
        });
        const verticalBanners = response.data.data || [];
        // Сохраняем в кэш через store с правильным ключом для вертикальных баннеров
        const key = restaurantId ? `vertical_${restaurantId}` : 'vertical_default';
        useStore.setState((state) => ({
          bannersByRestaurant: {
            ...state.bannersByRestaurant,
            [key]: verticalBanners,
          },
        }));
      } catch (error) {
        console.error('Failed to fetch vertical banners:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBanners();
  }, [restaurantId, bannersByRestaurant, initialBanners, setBannersForRestaurant]);

  // Автоматическое переключение слайдов
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000); // Переключение каждые 5 секунд

    return () => clearInterval(interval);
  }, [banners.length]);

  // Обработка клика на индикатор
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (isLoading || banners.length === 0) {
    return null;
  }

  return (
    <div className="relative flex items-start" ref={bannerRef} style={{ width: '160px', height: `${BANNER_HEIGHT}px` }}>
      {/* Баннер */}
      <div 
        className="relative overflow-hidden rounded-[15px] flex-shrink-0"
        style={{ 
          height: `${BANNER_HEIGHT}px`, 
          width: `${BANNER_WIDTH}px`,
          minHeight: `${BANNER_HEIGHT}px`,
          maxHeight: `${BANNER_HEIGHT}px`,
          minWidth: `${BANNER_WIDTH}px`,
          maxWidth: `${BANNER_WIDTH}px`
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="min-w-full flex-shrink-0 w-full h-full"
            >
              <div
                className={`bg-white rounded-[15px] shadow-sm overflow-hidden relative h-full ${banner.linkUrl ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={() => {
                  if (banner.linkUrl) {
                    window.open(banner.linkUrl, '_blank');
                  }
                }}
              >
                {banner.imageUrl ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover rounded-[15px]"
                    style={{ 
                      display: 'block', 
                      objectPosition: 'center',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center rounded-[15px]">
                    <span className="text-4xl">🖼️</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Индикаторы точек - справа от баннера, по центру вертикально */}
      {banners.length > 1 && (
        <div 
          className="absolute top-1/2 -translate-y-1/2 flex flex-col justify-center gap-2"
          style={{ left: `${BANNER_WIDTH + 8}px` }}
        >
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-2 h-8 bg-primary'
                  : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
