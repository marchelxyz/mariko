import { useEffect, useState } from 'react';
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
    <div className="relative w-full">
      <div className="overflow-hidden rounded-[15px] relative">
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
