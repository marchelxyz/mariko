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

  if (isLoading || banners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden"
        >
          <div className="w-full bg-secondary flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
            <span className="text-4xl">🖼️</span>
          </div>
          {banner.title && (
            <div className="p-4">
              <h3 className="font-medium text-text-primary">{banner.title}</h3>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
