import { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import '../styles/globals.css';

// Динамический импорт TelegramAuth только на клиенте
const TelegramAuth = dynamic(() => import('@/components/TelegramAuth'), {
  ssr: false,
});

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Инициализация WebApp только на клиенте
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk').then(({ default: WebApp }) => {
        WebApp.ready();
      }).catch((error) => {
        console.warn('Telegram WebApp SDK not available:', error);
      });
    }
  }, []);

  return (
    <>
      {mounted && <TelegramAuth />}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
