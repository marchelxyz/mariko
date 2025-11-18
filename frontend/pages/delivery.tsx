import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import VerticalBanners from '@/components/VerticalBanners';
import { useStore } from '@/store/useStore';

export default function Delivery() {
  const router = useRouter();
  const { selectedRestaurant } = useStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRestaurant?.id) {
      router.push('/');
      return;
    }
  }, [selectedRestaurant, router]);

  if (loading) {
    return (
      <Layout>
        <Header title="Доставка" />
        <div className="px-4 py-6">
          <div className="text-center text-text-primary">Загрузка...</div>
        </div>
      </Layout>
    );
  }

  const deliveryAggregators = selectedRestaurant?.deliveryAggregators || [];
  const firstTwoAggregators = deliveryAggregators.slice(0, 2);
  const remainingAggregators = deliveryAggregators.slice(2);

  return (
    <Layout>
      <Header title="Доставка" />
      <div className="px-4 py-6 space-y-6">
        {/* Кнопка назад */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-text-primary hover:opacity-80 transition-opacity"
          aria-label="Назад на главную"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-text-primary"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-base font-medium">Назад</span>
        </button>

        {/* Основной контент: сетка блоков слева, баннер справа */}
        {deliveryAggregators.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Доставка для этого ресторана не настроена</p>
          </div>
        ) : (
          <div className="flex flex-row flex-wrap items-start gap-3 max-w-7xl mx-auto">
            {/* Левая колонка: первые 2 агрегатора друг под другом - фиксированного размера */}
            {firstTwoAggregators.length > 0 && (
              <div className="flex flex-col gap-3 flex-shrink-0" id="delivery-buttons-container">
                {firstTwoAggregators.map((aggregator, index) => (
                  <a
                    key={index}
                    href={aggregator.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden block flex-shrink-0"
                    style={{ 
                      width: '160px', 
                      height: '120px',
                      minWidth: '160px',
                      maxWidth: '160px',
                      minHeight: '120px',
                      maxHeight: '120px'
                    }}
                  >
                    {aggregator.imageUrl ? (
                      <img
                        src={aggregator.imageUrl}
                        alt={aggregator.name}
                        className="w-full h-full object-cover"
                        style={{ display: 'block' }}
                      />
                    ) : (
                      <div 
                        className="w-full h-full bg-gray-200 flex items-center justify-center"
                      >
                        <span className="text-4xl">📦</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}

            {/* Правая часть: баннер и остальные агрегаторы */}
            <div className="flex flex-col md:flex-row flex-wrap items-start gap-3 flex-1 min-w-0">
              {/* Вертикальный баннер с защитными полями и индикатором */}
              <div className="flex-shrink-0" style={{ width: '160px', minWidth: '160px', maxWidth: '160px' }}>
                <VerticalBanners restaurantId={selectedRestaurant?.id} />
              </div>

              {/* Остальные агрегаторы - фиксированного размера, переносятся справа от баннера на больших экранах */}
              {remainingAggregators.length > 0 && (
                <div className="grid grid-cols-2 gap-3 flex-shrink-0 w-full md:w-auto md:grid-cols-none md:flex md:flex-wrap">
                  {remainingAggregators.map((aggregator, index) => (
                    <a
                      key={index + 2}
                      href={aggregator.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden block flex-shrink-0 w-full aspect-[4/3] md:w-[160px] md:h-[120px] md:min-w-[160px] md:max-w-[160px] md:min-h-[120px] md:max-h-[120px]"
                    >
                      {aggregator.imageUrl ? (
                        <img
                          src={aggregator.imageUrl}
                          alt={aggregator.name}
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full bg-gray-200 flex items-center justify-center"
                        >
                          <span className="text-4xl">📦</span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
