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

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await api.get('/banners', {
          params: restaurantId ? { restaurantId } : {},
        });
        setBanners(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      }
    };

    fetchBanners();
  }, [restaurantId]);

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden"
        >
          <div className="w-full h-48 bg-secondary flex items-center justify-center">
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
