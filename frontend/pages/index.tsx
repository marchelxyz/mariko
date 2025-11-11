import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStore } from '@/store/useStore';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import ActionButtons from '@/components/ActionButtons';
import Banners from '@/components/Banners';
import MenuPreview from '@/components/MenuPreview';

export default function Home() {
  const router = useRouter();
  const { selectedRestaurant, restaurants, fetchRestaurants } = useStore();

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return (
    <Layout>
      <Header />
      <div className="px-4 py-6 space-y-6">
        <ActionButtons />
        <Banners restaurantId={selectedRestaurant?.id} />
        <MenuPreview restaurantId={selectedRestaurant?.id} />
      </div>
    </Layout>
  );
}
