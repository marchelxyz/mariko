import { useEffect, useState } from 'react';
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
    <div className="relative flex items-center" style={{ gap: '1px' }}>
      {/* Баннер */}
      <div className="relative overflow-hidden rounded-[15px] flex-shrink-0">
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
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || 'Banner'}
                    className="w-full object-cover rounded-[15px]"
                    style={{ aspectRatio: '4/5', display: 'block' }}
                  />
                ) : (
                  <div className="w-full bg-secondary flex items-center justify-center rounded-[15px]" style={{ aspectRatio: '4/5' }}>
                    <span className="text-4xl">🖼️</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Индикаторы точек - справа, по центру вертикально, отступ 1px */}
      {banners.length > 1 && (
        <div className="flex flex-col justify-center gap-2 flex-shrink-0" style={{ marginLeft: '1px' }}>
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
