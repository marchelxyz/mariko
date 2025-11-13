import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useStore } from '@/store/useStore';

export default function ActionButtons() {
  const router = useRouter();
  const { selectedRestaurant } = useStore();
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const MapPinIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.03 7.03 1 12 1C16.97 1 21 5.03 21 10Z" fill="#8E1A1A"/>
      <circle cx="12" cy="10" r="3.5" fill="#FFFFFF"/>
    </svg>
  );

  const handleDeliveryClick = () => {
    if (selectedRestaurant?.deliveryAggregators && selectedRestaurant.deliveryAggregators.length > 0) {
      setIsDeliveryModalOpen(true);
    } else {
      alert('Доставка для этого ресторана не настроена');
    }
  };

  const handleLocationClick = () => {
    if (selectedRestaurant?.yandexMapsUrl || selectedRestaurant?.twoGisUrl || selectedRestaurant?.socialNetworks) {
      setIsLocationModalOpen(true);
    } else {
      alert('Информация о местоположении не настроена');
    }
  };

  const actions = [
    { label: 'Бронь столика', icon: <Image src="/image/iconBittom/Frame-2.svg" alt="Бронь столика" width={28} height={28} />, action: () => alert('Бронь столика') },
    { label: 'Заказать доставку', icon: <Image src="/image/iconBittom/Frame-1.svg" alt="Заказать доставку" width={28} height={28} />, action: handleDeliveryClick },
    { label: 'Оставить отзыв', icon: <Image src="/image/iconBittom/Frame.svg" alt="Оставить отзыв" width={28} height={28} />, action: () => alert('Оставить отзыв') },
    { label: 'Как нас найти', icon: <MapPinIcon />, action: handleLocationClick },
  ];

  return (
    <>
      <div className="bg-white px-4 py-4">
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action, index) => (
            <div key={index} className="flex flex-col items-center">
              <button
                onClick={action.action}
                className="bg-[#F7F7F7] rounded-[10px] p-3 flex items-center justify-center hover:opacity-90 transition-opacity aspect-square w-full"
              >
                <div className="flex items-center justify-center">
                  {action.icon}
                </div>
              </button>
              <span className="text-xs font-medium text-[#000000] text-center leading-tight mt-1">
                {action.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно доставки */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-primary">Доставка</h2>
              <button
                onClick={() => setIsDeliveryModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {selectedRestaurant?.deliveryAggregators?.map((aggregator, index) => (
                <a
                  key={index}
                  href={aggregator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {aggregator.imageUrl ? (
                    <img
                      src={aggregator.imageUrl}
                      alt={aggregator.name}
                      className="w-12 h-12 object-contain rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-lg">📦</span>
                    </div>
                  )}
                  <span className="flex-1 font-medium text-text-primary">{aggregator.name}</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-text-secondary"
                  >
                    <path
                      d="M7 17L17 7M17 7H7M17 7V17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно "Как нас найти" */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-primary">Как нас найти</h2>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {/* Карты */}
              {(selectedRestaurant?.yandexMapsUrl || selectedRestaurant?.twoGisUrl) && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Карты</h3>
                  <div className="space-y-2">
                    {selectedRestaurant.yandexMapsUrl && (
                      <a
                        href={selectedRestaurant.yandexMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 bg-yellow-400 rounded flex items-center justify-center">
                          <span className="text-lg">📍</span>
                        </div>
                        <span className="flex-1 font-medium text-text-primary">Яндекс.Карты</span>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-text-secondary"
                        >
                          <path
                            d="M7 17L17 7M17 7H7M17 7V17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    )}
                    {selectedRestaurant.twoGisUrl && (
                      <a
                        href={selectedRestaurant.twoGisUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-lg">🗺️</span>
                        </div>
                        <span className="flex-1 font-medium text-text-primary">2ГИС</span>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-text-secondary"
                        >
                          <path
                            d="M7 17L17 7M17 7H7M17 7V17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Социальные сети */}
              {selectedRestaurant?.socialNetworks && selectedRestaurant.socialNetworks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Социальные сети</h3>
                  <div className="space-y-2">
                    {selectedRestaurant.socialNetworks.map((network, index) => (
                      <a
                        key={index}
                        href={network.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
                          <span className="text-lg">📱</span>
                        </div>
                        <span className="flex-1 font-medium text-text-primary">{network.name}</span>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-text-secondary"
                        >
                          <path
                            d="M7 17L17 7M17 7H7M17 7V17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
