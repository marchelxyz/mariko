import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
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

        {/* Список агрегаторов доставки */}
        {deliveryAggregators.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Доставка для этого ресторана не настроена</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveryAggregators.map((aggregator, index) => (
              <a
                key={index}
                href={aggregator.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
              >
                {aggregator.imageUrl ? (
                  <img
                    src={aggregator.imageUrl}
                    alt={aggregator.name}
                    className="w-16 h-16 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                )}
                <span className="flex-1 font-medium text-text-primary text-lg">{aggregator.name}</span>
                <svg
                  width="24"
                  height="24"
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
        )}
      </div>
    </Layout>
  );
}
