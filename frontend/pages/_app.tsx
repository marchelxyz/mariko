import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import type { AppProps } from 'next/app';
import TelegramAuth from '@/components/TelegramAuth';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // WebApp автоматически инициализируется при импорте
    WebApp.ready();
  }, []);

  return (
    <>
      <TelegramAuth />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
