import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import { requestLocation, openLocationSettings, checkLocationPermission } from '@/lib/location';

interface LocationRequestProps {
  onLocationGranted?: () => void;
  onLocationDenied?: () => void;
}

export default function LocationRequest({ onLocationGranted, onLocationDenied }: LocationRequestProps) {
  const router = useRouter();
  const { restaurants, selectedRestaurant, favoriteRestaurant, selectNearestRestaurantByLocation } = useStore();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Не показываем запрос геолокации, если restaurantId указан в URL
    // (пользователь перешел по ссылке с явным указанием ресторана)
    if (router.query.restaurantId) {
      return;
    }

    // Показываем запрос геолокации только если:
    // 1. Нет выбранного ресторана
    // 2. Нет избранного ресторана
    // 3. Есть рестораны с координатами
    if (!selectedRestaurant && !favoriteRestaurant && restaurants.length > 0) {
      const restaurantsWithCoords = restaurants.filter(r => {
        const lat = typeof r.latitude === 'string' ? parseFloat(r.latitude) : r.latitude;
        const lon = typeof r.longitude === 'string' ? parseFloat(r.longitude) : r.longitude;
        return lat != null && !isNaN(lat) && lon != null && !isNaN(lon);
      });

      if (restaurantsWithCoords.length > 0) {
        // Небольшая задержка перед показом промпта
        const timer = setTimeout(() => {
          // Проверяем разрешение на геолокацию
          checkLocationPermission().then((permission) => {
            if (permission && !permission.isPermissionGranted) {
              // Показываем промпт только если разрешение не предоставлено
              setShowPrompt(true);
            }
          });
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [selectedRestaurant, favoriteRestaurant, restaurants, router.query.restaurantId]);

  const handleRequestLocation = async () => {
    setIsRequesting(true);
    try {
      const success = await selectNearestRestaurantByLocation(true);
      if (success) {
        setShowPrompt(false);
        onLocationGranted?.();
      } else {
        onLocationDenied?.();
      }
    } catch (error) {
      console.error('Ошибка при запросе геолокации:', error);
      onLocationDenied?.();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    await openLocationSettings();
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold mb-4">Определить ближайший ресторан</h3>
        <p className="text-gray-600 mb-6">
          Поделитесь своей геолокацией, чтобы мы могли показать вам ближайший ресторан и актуальное меню с ценами.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRequestLocation}
            disabled={isRequesting}
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? 'Определение...' : 'Поделиться геолокацией'}
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Пропустить
          </button>
        </div>
        <button
          onClick={handleOpenSettings}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Открыть настройки геолокации
        </button>
      </div>
    </div>
  );
}
