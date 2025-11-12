import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Header from '@/components/Header';
import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import api from '@/lib/api';

export default function Profile() {
  const { user, fetchProfile, updateProfile } = useStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : '',
        gender: user.gender || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
    setIsEditing(false);
  };

  return (
    <Layout>
      <Header title="Профиль" showLogo />
      <div className="px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
              {user?.photoUrl ? (
                <img 
                  src={user.photoUrl} 
                  alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {user?.firstName || 'Пользователь'} {user?.lastName || ''}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                ФИО
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  placeholder="Имя"
                />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                  placeholder="Фамилия"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Дата рождения
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Пол
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Номер телефона
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                placeholder="+7 (999) 999-99-99"
              />
            </div>

            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-text-secondary px-4 py-2 rounded-md font-medium"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      if (user) {
                        setFormData({
                          firstName: user.firstName || '',
                          lastName: user.lastName || '',
                          phoneNumber: user.phoneNumber || '',
                          dateOfBirth: user.dateOfBirth ? format(new Date(user.dateOfBirth), 'yyyy-MM-dd') : '',
                          gender: user.gender || '',
                        });
                      }
                    }}
                    className="flex-1 bg-gray-300 text-text-primary px-4 py-2 rounded-md font-medium"
                  >
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-primary text-text-secondary px-4 py-2 rounded-md font-medium"
                >
                  Редактировать
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
