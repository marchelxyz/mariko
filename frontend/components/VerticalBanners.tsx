import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
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
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Фиксированные размеры: высота двух кнопок (120px каждая) + gap (12px) = 252px
  const BANNER_HEIGHT = 252;
  // Ширина баннера: до защитных полей контейнера (160px)
  const BANNER_WIDTH = 160;

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

  // Функция для сброса и перезапуска автоматического переключения
  const resetAutoSlide = () => {
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
    }
    if (banners.length <= 1) return;
    
    autoSlideIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
  };

  // Автоматическое переключение слайдов
  useEffect(() => {
    if (banners.length <= 1) return;
    
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
    }
    
    autoSlideIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);

    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
      }
    };
  }, [banners.length]);

  // Обработка клика на индикатор
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    resetAutoSlide(); // Сбрасываем таймер при ручном переключении
  };

  // Переход к следующему слайду
  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    resetAutoSlide();
  };

  // Переход к предыдущему слайду
  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
    resetAutoSlide();
  };

  // Обработка начала касания
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  // Обработка окончания касания
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndY.current = e.changedTouches[0].clientY;
    handleSwipe();
  };

  // Определение направления свайпа
  const handleSwipe = () => {
    if (!touchStartY.current || !touchEndY.current) return;
    
    const distance = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50; // Минимальное расстояние для свайпа

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Свайп вверх - следующий слайд
        nextSlide();
      } else {
        // Свайп вниз - предыдущий слайд
        prevSlide();
      }
    }

    // Сбрасываем значения
    touchStartY.current = null;
    touchEndY.current = null;
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Кнопка "Вверх" */}
        {banners.length > 1 && (
          <button
            onClick={prevSlide}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all duration-200 flex items-center justify-center"
            aria-label="Предыдущий слайд"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        )}

        {/* Кнопка "Вниз" */}
        {banners.length > 1 && (
          <button
            onClick={nextSlide}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all duration-200 flex items-center justify-center"
            aria-label="Следующий слайд"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
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
                  <div
                    className="w-full h-full rounded-[15px] overflow-hidden"
                    style={{
                      position: 'relative',
                    }}
                  >
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title || 'Banner'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{
                        objectPosition: 'center',
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center rounded-[15px]">
                    <span className="text-4xl">🖼️</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Индикаторы точек - на баннере, справа с отступом 1px от правого края */}
        {banners.length > 1 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col justify-center gap-2 z-10"
            style={{ right: '1px' }}
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
    </div>
  );
}
