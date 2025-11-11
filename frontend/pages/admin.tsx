import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';

export default function Admin() {
  const { user } = useStore();

  if (!user || !['admin', 'marketing', 'manager'].includes(user.role)) {
    return (
      <Layout>
        <div className="px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-text-primary">Доступ запрещен</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Админ панель" />
      <div className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-text-primary mb-4">Управление баннерами</h2>
          <p className="text-text-primary">Функционал в разработке</p>
        </div>
        {user.role === 'admin' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">Управление ролями</h2>
            <p className="text-text-primary">Функционал в разработке</p>
          </div>
        )}
        {(user.role === 'admin' || user.role === 'marketing') && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">Настройка рассылок</h2>
            <p className="text-text-primary">Функционал в разработке</p>
          </div>
        )}
        {(user.role === 'admin' || user.role === 'manager') && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">Добавление изображений блюд</h2>
            <p className="text-text-primary">Функционал в разработке</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
