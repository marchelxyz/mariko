import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Header from '@/components/Header';

export default function Franchise() {
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем, загрузился ли iframe
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleIframeError = () => {
    setIframeError(true);
    setIsLoading(false);
  };

  return (
    <Layout>
      <Header title="Франшиза" />
      <div className="relative w-full" style={{ 
        height: 'calc(100vh - 200px)', // Вычитаем высоту Header и нижнего меню
        minHeight: '400px',
      }}>
        {iframeError ? (
          <div className="px-4 py-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-primary mb-4">О франшизе</h2>
              <p className="text-text-primary mb-4">
                Не удалось загрузить страницу. Пожалуйста, перейдите по ссылке:
              </p>
              <a 
                href="https://marikodostavka.ru/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary-dark"
              >
                https://marikodostavka.ru/
              </a>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-text-primary">Загрузка...</p>
                </div>
              </div>
            )}
            <iframe
              src="https://marikodostavka.ru/"
              className="w-full h-full border-0 absolute inset-0"
              onError={handleIframeError}
              onLoad={() => setIsLoading(false)}
              title="Франшиза"
              allow="fullscreen"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
            />
          </>
        )}
      </div>
    </Layout>
  );
}
