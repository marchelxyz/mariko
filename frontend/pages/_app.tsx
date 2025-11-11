import { useEffect } from 'react';
import { init } from '@twa-dev/sdk';
import type { AppProps } from 'next/app';
import TelegramAuth from '@/components/TelegramAuth';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <TelegramAuth />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
