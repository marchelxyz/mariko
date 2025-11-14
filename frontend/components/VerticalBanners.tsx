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
  const [bannerHeight, setBannerHeight] = useState<number | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

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

  // Вычисляем высоту баннера на основе высоты двух кнопок доставки
  useEffect(() => {
    // Пропускаем на сервере
    if (typeof window === 'undefined') return;

    const calculateBannerHeight = () => {
      const deliveryContainer = document.getElementById('delivery-buttons-container');
      if (deliveryContainer) {
        const buttons = deliveryContainer.querySelectorAll('a');
        if (buttons.length >= 2) {
          // Высота первой кнопки
          const firstButtonHeight = buttons[0].offsetHeight;
          // Высота второй кнопки
          const secondButtonHeight = buttons[1].offsetHeight;
          // Получаем отступ из computed styles (gap-3 = 0.75rem)
          const computedStyle = window.getComputedStyle(deliveryContainer);
          const gap = parseFloat(computedStyle.gap) || 12; // fallback на 12px если не удалось получить
          // Общая высота двух кнопок с отступом
          const totalHeight = firstButtonHeight + secondButtonHeight + gap;
          if (totalHeight > 0) {
            setBannerHeight(totalHeight);
          }
        }
      }
    };

    // Вычисляем высоту при загрузке и изменении размера окна
    calculateBannerHeight();
    window.addEventListener('resize', calculateBannerHeight);
    
    // Проверяем несколько раз с задержками, чтобы убедиться, что изображения загрузились
    const timeouts = [
      setTimeout(calculateBannerHeight, 100),
      setTimeout(calculateBannerHeight, 300),
      setTimeout(calculateBannerHeight, 500),
    ];

    // Используем ResizeObserver для отслеживания изменений размера контейнера с кнопками
    let resizeObserver: ResizeObserver | null = null;
    let observedContainer: HTMLElement | null = null;
    
    // Пытаемся найти контейнер с задержкой, если его еще нет
    const setupResizeObserver = () => {
      // Отписываемся от предыдущего observer, если он был
      if (resizeObserver && observedContainer) {
        resizeObserver.unobserve(observedContainer);
        resizeObserver.disconnect();
      }
      
      const deliveryContainer = document.getElementById('delivery-buttons-container');
      if (deliveryContainer && typeof ResizeObserver !== 'undefined') {
        observedContainer = deliveryContainer;
        resizeObserver = new ResizeObserver(() => {
          calculateBannerHeight();
        });
        resizeObserver.observe(deliveryContainer);
      }
    };

    setupResizeObserver();
    // Также пробуем установить observer после небольших задержек
    const observerTimeouts = [
      setTimeout(setupResizeObserver, 100),
      setTimeout(setupResizeObserver, 300),
    ];

    return () => {
      window.removeEventListener('resize', calculateBannerHeight);
      timeouts.forEach(timeout => clearTimeout(timeout));
      observerTimeouts.forEach(timeout => clearTimeout(timeout));
      if (resizeObserver && observedContainer) {
        resizeObserver.unobserve(observedContainer);
        resizeObserver.disconnect();
      }
    };
  }, [banners.length]);

  // Обработка клика на индикатор
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (isLoading || banners.length === 0) {
    return null;
  }

  // Вычисляем ширину на основе высоты и соотношения сторон 3/4
  const bannerWidth = bannerHeight ? (bannerHeight * 3) / 4 : null;

  return (
    <div className="relative flex items-start" ref={bannerRef}>
      {/* Баннер */}
      <div 
        className="relative overflow-hidden rounded-[15px] flex-shrink-0"
        style={bannerHeight && bannerWidth ? { 
          height: `${bannerHeight}px`, 
          width: `${bannerWidth}px`,
          maxHeight: `${bannerHeight}px`,
          maxWidth: `${bannerWidth}px`,
          minWidth: 0,
          aspectRatio: '3/4'
        } : { aspectRatio: '3/4', minWidth: 0, maxWidth: '100%' }}
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

      {/* Защитные поля справа от баннера */}
      <div 
        className="relative flex-shrink-0" 
        style={bannerHeight ? { 
          height: `${bannerHeight}px`,
          paddingLeft: '16px',
          paddingRight: '16px'
        } : {
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
      >
        {/* Индикаторы точек - на защитных полях, налезая на них, по центру вертикально */}
        {banners.length > 1 && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 flex flex-col justify-center gap-2"
            style={{ right: '16px' }}
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
