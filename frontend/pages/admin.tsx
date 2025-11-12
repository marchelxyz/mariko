import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  roles: string[];
  available: boolean;
}

export default function Admin() {
  const { user } = useStore();
  const router = useRouter();

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

  const sections: AdminSection[] = [
    {
      id: 'restaurants',
      title: 'Управление ресторанами',
      description: 'Просмотр и управление ресторанами, активация/деактивация',
      icon: '🏢',
      path: '/admin/restaurants',
      roles: ['admin'],
      available: true,
    },
    {
      id: 'banners',
      title: 'Управление баннерами',
      description: 'Создание и редактирование баннеров для главной страницы',
      icon: '🖼️',
      path: '/admin/banners',
      roles: ['admin'],
      available: true,
    },
    {
      id: 'roles',
      title: 'Управление ролями',
      description: 'Назначение ролей пользователям',
      icon: '👥',
      path: '/admin/roles',
      roles: ['admin'],
      available: false,
    },
    {
      id: 'notifications',
      title: 'Настройка рассылок',
      description: 'Управление уведомлениями и рассылками',
      icon: '📢',
      path: '/admin/notifications',
      roles: ['admin', 'marketing'],
      available: false,
    },
    {
      id: 'menu-images',
      title: 'Изображения блюд',
      description: 'Добавление и управление изображениями блюд',
      icon: '🍽️',
      path: '/admin/menu-images',
      roles: ['admin', 'manager'],
      available: true,
    },
  ];

  // Фильтруем разделы по роли пользователя
  const availableSections = sections.filter(
    (section) => section.roles.includes(user.role)
  );

  const handleSectionClick = (section: AdminSection) => {
    if (section.available) {
      router.push(section.path);
    } else {
      alert('Этот раздел находится в разработке');
    }
  };

  return (
    <Layout>
      <Header title="Админ панель" />
      <div className="px-4 py-6">
        <div className="grid grid-cols-2 gap-4">
          {availableSections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionClick(section)}
              disabled={!section.available}
              className={`
                bg-white rounded-lg shadow-sm p-6 text-left
                transition-all duration-200
                ${section.available
                  ? 'hover:shadow-md hover:scale-105 cursor-pointer active:scale-100'
                  : 'opacity-60 cursor-not-allowed'
                }
              `}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="text-4xl mb-2">{section.icon}</div>
                <h3 className="text-lg font-bold text-text-primary">
                  {section.title}
                </h3>
                <p className="text-sm text-text-secondary">
                  {section.description}
                </p>
                {!section.available && (
                  <span className="text-xs text-gray-400 mt-2">
                    В разработке
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
