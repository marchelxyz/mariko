import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import TelegramAuth from '@/components/TelegramAuth';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Инициализация WebApp только на клиенте
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk').then(({ default: WebApp }) => {
        WebApp.ready();
      });
    }
  }, []);

  return (
    <>
      <TelegramAuth />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
