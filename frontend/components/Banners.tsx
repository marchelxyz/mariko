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

interface BannersProps {
  restaurantId?: string;
  initialBanners?: Banner[];
}

export default function Banners({ restaurantId, initialBanners }: BannersProps) {
  const { bannersByRestaurant, setBannersForRestaurant } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Получаем баннеры из кэша для конкретного ресторана
  // Используем ключ с префиксом для горизонтальных баннеров
  const key = restaurantId ? `horizontal_${restaurantId}` : 'horizontal_default';
  const cachedBanners = bannersByRestaurant[key] || [];
  
  // Используем предзагруженные баннеры, если они есть и кэш пуст
  const banners = cachedBanners.length > 0 ? cachedBanners : (initialBanners || []);

  useEffect(() => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;

    const loadBanners = async () => {
      const key = restaurantId ? `horizontal_${restaurantId}` : 'horizontal_default';
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
        // Загружаем горизонтальные баннеры через API
        const response = await api.get('/banners', {
          params: {
            type: 'horizontal',
            ...(restaurantId && { restaurantId }),
          },
        });
        const horizontalBanners = response.data.data || [];
        
        // Сохраняем в кэш через store с правильным ключом для горизонтальных баннеров
        setBannersForRestaurant(key, horizontalBanners);
      } catch (error) {
        console.error('Failed to fetch horizontal banners:', error);
        // Не показываем ошибку пользователю, просто не отображаем баннеры
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
    touchStartX.current = e.touches[0].clientX;
  };

  // Обработка окончания касания
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    handleSwipe();
  };

  // Определение направления свайпа
  const handleSwipe = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Минимальное расстояние для свайпа

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Свайп влево - следующий слайд
        nextSlide();
      } else {
        // Свайп вправо - предыдущий слайд
        prevSlide();
      }
    }

    // Сбрасываем значения
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (isLoading || banners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      <div 
        className="overflow-hidden rounded-[15px] relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Кнопка "Назад" */}
        {banners.length > 1 && (
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 flex items-center justify-center"
            aria-label="Предыдущий слайд"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Кнопка "Вперед" */}
        {banners.length > 1 && (
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 flex items-center justify-center"
            aria-label="Следующий слайд"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="min-w-full flex-shrink-0 w-full"
            >
              <div
                className={`bg-white rounded-[15px] shadow-sm overflow-hidden relative ${banner.linkUrl ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={() => {
                  if (banner.linkUrl) {
                    window.open(banner.linkUrl, '_blank');
                  }
                }}
              >
                {banner.imageUrl ? (
                  <div
                    className="w-full rounded-[15px] overflow-hidden"
                    style={{
                      aspectRatio: '16/9',
                      position: 'relative',
                    }}
                  >
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title || 'Banner'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="w-full bg-secondary flex items-center justify-center rounded-[15px]" style={{ aspectRatio: '16/9' }}>
                    <span className="text-4xl">🖼️</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Индикаторы точек - на баннере, 1px выше нижнего края */}
        {banners.length > 1 && (
          <div className="absolute bottom-[1px] left-0 right-0 flex justify-center gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-white/70 hover:bg-white/90'
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
