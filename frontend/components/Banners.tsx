import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

interface BannersProps {
  restaurantId?: string;
}

export default function Banners({ restaurantId }: BannersProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Пропускаем запрос на сервере
    if (typeof window === 'undefined') return;

    const fetchBanners = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/banners', {
          params: restaurantId ? { restaurantId } : {},
        });
        setBanners(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
        // Не показываем ошибку пользователю, просто не отображаем баннеры
      } finally {
        setIsLoading(false);
      }
    };

    fetchBanners();
  }, [restaurantId]);

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
    <div className="relative">
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
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || 'Banner'}
                    className="w-full object-cover rounded-[15px]"
                    style={{ aspectRatio: '16/9', display: 'block' }}
                  />
                ) : (
                  <div className="w-full bg-secondary flex items-center justify-center rounded-[15px]" style={{ aspectRatio: '16/9' }}>
                    <span className="text-4xl">🖼️</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Индикаторы точек - на баннере, 2px выше нижнего края */}
        {banners.length > 1 && (
          <div className="absolute bottom-[2px] left-0 right-0 flex justify-center gap-2 pb-2">
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
